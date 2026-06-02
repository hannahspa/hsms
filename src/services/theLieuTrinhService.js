import { supabase } from '../lib/supabase'
import { sortCardsNewestFirst } from '../apps/admin/the-lieu-trinh/theLieuTrinhUtils'

const PRIMARY_CARD_SELECT = '*, khach_hang:khach_hang_id(ho_ten, so_dien_thoai), combo:combo_id(ten_combo, ma_combo)'
const LEGACY_CARD_SELECT = '*, khach_hang:khach_hang_id(ho_ten, so_dien_thoai)'

function isMissingRpc(error) {
  return error?.code === 'PGRST202' || /function .* does not exist/i.test(error?.message || '')
}

function getRemainingSessions(card) {
  if (card.is_khong_gioi_han) return Number.POSITIVE_INFINITY
  return Number(card.so_buoi_con_lai ?? ((card.so_buoi_tong || 0) - (card.so_buoi_da_dung || 0)))
}

function buildUsedGuard(query, currentUsed) {
  return currentUsed == null
    ? query.is('so_buoi_da_dung', null)
    : query.eq('so_buoi_da_dung', currentUsed)
}

export const theLieuTrinhService = {
  async loadCardsProgressively({ pageSize, backgroundFetchSize, onCards }) {
    const fetchRange = (selectText, from, to) => supabase
      .from('the_lieu_trinh')
      .select(selectText)
      .order('ngay_mua', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false })
      .range(from, to)

    const loadWithSelect = async (selectText) => {
      const first = await fetchRange(selectText, 0, pageSize - 1)
      if (first.error) throw first.error

      const allCards = [...(first.data || [])]
      onCards?.([...allCards].sort(sortCardsNewestFirst), { firstPage: true })

      if (!first.data || first.data.length < pageSize) return allCards

      let from = pageSize
      while (true) {
        const next = await fetchRange(selectText, from, from + backgroundFetchSize - 1)
        if (next.error) throw next.error
        const page = next.data || []
        allCards.push(...page)
        onCards?.([...allCards].sort(sortCardsNewestFirst), { firstPage: false })
        if (page.length < backgroundFetchSize) break
        from += backgroundFetchSize
      }

      return allCards
    }

    try {
      return (await loadWithSelect(PRIMARY_CARD_SELECT)).sort(sortCardsNewestFirst)
    } catch {
      return (await loadWithSelect(LEGACY_CARD_SELECT)).sort(sortCardsNewestFirst)
    }
  },

  async loadCombosWithBackfill() {
    const { data, error } = await supabase
      .from('combo_lieu_trinh')
      .select('*, dich_vu:combo_lieu_trinh_dich_vu(*)')
      .order('created_at', { ascending: false })

    if (error) {
      return {
        combos: [],
        backfill: [],
        error: 'Chưa chạy migration 027_combo_lieu_trinh.sql nên HSMS chưa có bảng combo liệu trình.',
      }
    }

    const { data: summary } = await supabase
      .from('v_combo_lieu_trinh_backfill_summary')
      .select('*')

    return {
      combos: data || [],
      backfill: summary || [],
      error: '',
    }
  },

  async checkoutSession({ card, ngaySuDung, ghiChu, nguoiGhi = 'admin' }) {
    const remain = getRemainingSessions(card)
    if (remain <= 0) throw new Error('Thẻ đã hết buổi.')

    const rpc = await supabase.rpc('hsms_checkout_treatment_session', {
      p_card_id: card.id,
      p_ngay_su_dung: ngaySuDung,
      p_ghi_chu: ghiChu || null,
      p_nguoi_ghi: nguoiGhi,
    })

    if (!rpc.error) {
      if (rpc.data?.success === false) throw new Error(rpc.data.error || 'Không ghi nhận được buổi sử dụng.')
      return rpc.data
    }
    if (!isMissingRpc(rpc.error)) throw rpc.error

    const currentUsed = card.so_buoi_da_dung
    const usedBefore = Number(currentUsed || 0)
    const newUsed = usedBefore + 1
    const newStatus = card.is_khong_gioi_han
      ? (card.trang_thai || 'active')
      : ((card.so_buoi_tong || 0) - newUsed <= 0 ? 'het_buoi' : (card.trang_thai || 'active'))

    let updateQuery = supabase
      .from('the_lieu_trinh')
      .update({
        so_buoi_da_dung: newUsed,
        trang_thai: newStatus,
      })
      .eq('id', card.id)

    updateQuery = buildUsedGuard(updateQuery, currentUsed)
    const { data: updated, error: updateError } = await updateQuery
      .select('id, so_buoi_tong, so_buoi_da_dung, so_buoi_con_lai, trang_thai')
      .maybeSingle()
    if (updateError) throw updateError
    if (!updated) throw new Error('Thẻ vừa được cập nhật ở nơi khác, vui lòng tải lại trước khi trừ buổi.')

    const { error: usageError } = await supabase
      .from('the_lieu_trinh_su_dung')
      .insert({
        the_lieu_trinh_id: card.id,
        ngay_su_dung: ngaySuDung,
        ghi_chu: ghiChu || null,
        nguoi_ghi: nguoiGhi,
      })

    if (usageError) {
      let rollback = supabase
        .from('the_lieu_trinh')
        .update({
          so_buoi_da_dung: usedBefore,
          trang_thai: card.trang_thai || 'active',
        })
        .eq('id', card.id)
      rollback = buildUsedGuard(rollback, newUsed)
      await rollback
      throw usageError
    }

    return {
      success: true,
      card_id: updated.id,
      so_buoi_da_dung: updated.so_buoi_da_dung,
      so_buoi_con_lai: updated.so_buoi_con_lai,
      trang_thai: updated.trang_thai,
    }
  },
}

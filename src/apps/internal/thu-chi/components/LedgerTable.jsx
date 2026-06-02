import { formatCurrency } from '../../../../lib/utils'
import I from '../../../../components/shared/Icons'

export default function LedgerTable({ data, onEdit, onDelete }) {
  return (
    <table className="ledger">
      <thead>
        <tr>
          <th>Giờ</th>
          <th>Loại</th>
          <th>Diễn Giải</th>
          <th>Nguồn</th>
          <th className="r">Số Tiền</th>
          <th className="r" style={{ width: 60 }}></th>
        </tr>
      </thead>
      <tbody>
        {data.map((tx, index) => {
          const isThu = tx._t === 'thu'
          const isChi = tx._t === 'chi'
          const tagClass = isThu ? 'sv' : 'ut'
          const tagLabel = isThu ? 'Doanh Thu' : isChi ? 'Chi Phí' : 'Chuyển Khoản'
          const paymentKey = tx.hinh_thuc || tx.hinh_thuc_thanh_toan
          const methodLabel = paymentKey === 'tien_mat'
            ? 'Tiền Mặt'
            : paymentKey === 'chuyen_khoan'
              ? 'Chuyển Khoản'
              : paymentKey === 'quet_the'
                ? 'Quẹt Thẻ'
                : '-'
          const methodClass = paymentKey === 'tien_mat' ? 'cash' : paymentKey === 'chuyen_khoan' ? 'transfer' : 'card'
          const amountClass = isChi ? 'amt out' : 'amt in'
          const amountPrefix = isChi ? '-' : '+'

          return (
            <tr key={tx.id || index}>
              <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: 'var(--ink3)', fontSize: 12 }}>
                {tx.created_at ? new Date(tx.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </td>
              <td><span className={`tag ${tagClass}`}>{tagLabel}</span></td>
              <td className="nm">{tx.dien_giai || 'Giao dịch'}</td>
              <td style={{ whiteSpace: 'nowrap' }}><span className={`method ${methodClass}`}>{methodLabel}</span></td>
              <td className={amountClass}>{amountPrefix}{formatCurrency(tx.so_tien)}</td>
              <td className="r">
                <div style={{ display: 'flex', gap: 3 }}>
                  <button onClick={() => onEdit(tx)} className="icon-btn" style={{ width: 24, height: 24 }} title="Sửa">
                    <I.Edit style={{ width: 11, height: 11 }} />
                  </button>
                  <button onClick={() => onDelete(tx)} className="icon-btn" style={{ width: 24, height: 24 }} title="Xóa">
                    <I.Trash style={{ width: 11, height: 11, color: 'var(--danger)' }} />
                  </button>
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

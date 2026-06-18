import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
const GRAPH_VERSION = Deno.env.get('META_GRAPH_VERSION') || 'v25.0'
const FALLBACK_PAGE_TOKEN = Deno.env.get('META_PAGE_ACCESS_TOKEN') || ''
const PAGE_INSIGHT_METRICS = (Deno.env.get('META_PAGE_INSIGHT_METRICS') || '')
  .split(',')
  .map((metric) => metric.trim())
  .filter(Boolean)

let supabase: ReturnType<typeof createClient>

function initSupabase(req: Request) {
  const requestKey = req.headers.get('apikey') || ''
  const auth = req.headers.get('Authorization') || (requestKey ? `Bearer ${requestKey}` : '')
  const key = SERVICE_KEY || ANON_KEY || requestKey
  if (!SUPABASE_URL) throw new Error('Thieu SUPABASE_URL trong Edge Function env')
  if (!key) throw new Error('Thieu Supabase key trong Edge Function env/request')
  supabase = createClient(SUPABASE_URL, key, {
    global: { headers: auth ? { Authorization: auth } : {} },
  })
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

type ConnectedPage = {
  id: string
  kenh: string
  page_id: string
  page_name: string
  page_access_token_secret?: string
  metadata?: Record<string, any> | null
}

function graphUrl(path: string, params: Record<string, string | number | undefined>, token: string) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
  }
  url.searchParams.set('access_token', token)
  return url.toString()
}

async function graphGet(path: string, params: Record<string, string | number | undefined>, token: string) {
  const res = await fetch(graphUrl(path, params, token))
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message || JSON.stringify(data))
  return data
}

async function graphPost(path: string, body: Record<string, unknown>, token: string) {
  const url = graphUrl(path, {}, token)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message || JSON.stringify(data))
  return data
}

async function graphUrlGet(url: string) {
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message || JSON.stringify(data))
  return data
}

async function getSecret(name?: string) {
  if (!name) return FALLBACK_PAGE_TOKEN
  const { data, error } = await supabase.rpc('marketing_get_vault_secret', { p_secret_name: name })
  if (error) return FALLBACK_PAGE_TOKEN
  return data || FALLBACK_PAGE_TOKEN
}

function secretNameForPage(pageId: string) {
  const clean = String(pageId || '').replace(/[^a-zA-Z0-9_]/g, '_')
  return `HSMS_META_PAGE_TOKEN_${clean}_${Date.now()}`
}

async function saveTokenToVault(secretName: string, token: string) {
  const { error } = await supabase.rpc('marketing_create_vault_secret', {
    p_secret_value: token,
    p_secret_name: secretName,
    p_description: 'HSMS Meta Page Access Token',
  })
  if (error) throw new Error(errorMessage(error))
  return secretName
}

function countSummary(summary: any) {
  return Number(summary?.total_count || 0)
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const e = error as Record<string, any>
    return e.message || e.error_description || e.details || e.hint || JSON.stringify(e)
  }
  return String(error)
}

function optNumber(opts: Record<string, any>, key: string, fallback: number, min: number, max: number) {
  return Math.min(Math.max(Number(opts[key] || fallback), min), max)
}

function optSinceDate(opts: Record<string, any>) {
  return opts.since_date ? new Date(String(opts.since_date)) : null
}

function isBeforeSince(value: string | undefined | null, sinceDate: Date | null) {
  return !!sinceDate && !!value && new Date(value) < sinceDate
}

function hasOlderThanSince(items: any[], field: string, sinceDate: Date | null) {
  return !!sinceDate && items.some((item) => isBeforeSince(item?.[field], sinceDate))
}

function chunkRows<T>(rows: T[], size = 500) {
  const chunks: T[][] = []
  for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size))
  return chunks
}

function pageMetadata(page: ConnectedPage) {
  return (page.metadata && typeof page.metadata === 'object') ? page.metadata : {}
}

function cursorKey(opts: Record<string, any> = {}) {
  const raw = String(opts.cursor_key || 'conversation_cursor')
  return raw.replace(/[^a-zA-Z0-9_]/g, '_') || 'conversation_cursor'
}

function conversationCursor(page: ConnectedPage, key = 'conversation_cursor') {
  const metadata = pageMetadata(page)
  const cursor = metadata[key]
  return (cursor && typeof cursor === 'object') ? cursor : {}
}

async function saveConversationCursor(page: ConnectedPage, cursorPatch: Record<string, any>, key = 'conversation_cursor') {
  const metadata = pageMetadata(page)
  const nextMetadata = {
    ...metadata,
    [key]: {
      ...(metadata[key] || {}),
      ...cursorPatch,
      updated_at: new Date().toISOString(),
    },
  }

  const { error } = await supabase.from('marketing_connected_pages')
    .update({
      metadata: nextMetadata,
      last_synced_at: new Date().toISOString(),
    })
    .eq('id', page.id)

  if (error) throw new Error(errorMessage(error))
  page.metadata = nextMetadata
  return nextMetadata[key]
}

async function upsertPage(page: ConnectedPage, token: string) {
  const data = await graphGet(page.page_id, {
    fields: [
      'id',
      'name',
      'username',
      'link',
      'picture.type(large){url}',
      'cover{source}',
      'category',
      'about',
      'fan_count',
      'followers_count',
      'talking_about_count',
    ].join(','),
  }, token)

  await supabase.from('marketing_connected_pages').upsert({
    id: page.id,
    kenh: page.kenh || 'facebook',
    page_id: data.id || page.page_id,
    page_name: data.name || page.page_name,
    username: data.username || null,
    page_url: data.link || null,
    avatar_url: data.picture?.data?.url || null,
    cover_url: data.cover?.source || null,
    category: data.category || null,
    about: data.about || null,
    fan_count: Number(data.fan_count || 0),
    followers_count: Number(data.followers_count || 0),
    talking_about_count: Number(data.talking_about_count || 0),
    last_synced_at: new Date().toISOString(),
    metadata: {
      ...pageMetadata(page),
      raw_page: data,
      current_metrics: {
        fan_count: Number(data.fan_count || 0),
        followers_count: Number(data.followers_count || 0),
        talking_about_count: Number(data.talking_about_count || 0),
      },
    },
  }, { onConflict: 'kenh,page_id' })

  return data
}

async function syncPosts(page: ConnectedPage, token: string, opts: Record<string, any> = {}) {
  const sinceDate = optSinceDate(opts)
  const postLimit = optNumber(opts, 'post_limit', 25, 1, 2000)
  const postPageLimit = Math.min(optNumber(opts, 'post_page_limit', 100, 1, 100), postLimit)
  const maxPostPages = optNumber(opts, 'post_pages', opts.max_pages || 1, 1, 50)
  const fields = [
    'id',
    'message',
    'story',
    'permalink_url',
    'created_time',
    'status_type',
    'full_picture',
    'comments.limit(0).summary(true)',
    'reactions.limit(0).summary(true)',
  ].join(',')

  let data = await graphGet(`${page.page_id}/posts`, {
    limit: postPageLimit,
    fields,
    since: opts.since_date ? String(opts.since_date) : undefined,
  }, token)

  const rows: any[] = []
  let pageNo = 0
  while (data?.data?.length && pageNo < maxPostPages && rows.length < postLimit) {
    pageNo += 1
    const posts = data.data || []
    for (const post of posts) {
      if (rows.length >= postLimit) break
      if (isBeforeSince(post.created_time, sinceDate)) continue
      const commentsCount = countSummary(post.comments?.summary)
      const reactionsCount = countSummary(post.reactions?.summary)
      rows.push({
        connected_page_id: page.id,
        kenh: page.kenh || 'facebook',
        page_id: page.page_id,
        platform_post_id: post.id,
        permalink_url: post.permalink_url || null,
        message: post.message || null,
        story: post.story || null,
        post_type: null,
        status_type: post.status_type || null,
        full_picture: post.full_picture || null,
        created_time: post.created_time || null,
        shares_count: 0,
        comments_count: commentsCount,
        reactions_count: reactionsCount,
        insights: {
          comments_count: commentsCount,
          reactions_count: reactionsCount,
          source: 'post_summary',
        },
        raw: post,
        last_synced_at: new Date().toISOString(),
      })
    }
    if (hasOlderThanSince(posts, 'created_time', sinceDate)) break
    if (!data.paging?.next) break
    data = await graphUrlGet(data.paging.next)
  }

  if (rows.length === 0) return []
  const savedRows: any[] = []
  for (const batch of chunkRows(rows)) {
    const { data: saved, error } = await supabase.from('marketing_page_posts')
      .upsert(batch, { onConflict: 'kenh,platform_post_id' })
      .select('id, platform_post_id')
    if (error) throw new Error(errorMessage(error))
    savedRows.push(...(saved || []))
  }
  return savedRows
}

async function syncComments(page: ConnectedPage, token: string, posts: Array<{ id: string; platform_post_id: string }>, opts: Record<string, any> = {}) {
  const sinceDate = optSinceDate(opts)
  const commentPageLimit = optNumber(opts, 'comment_limit', 25, 1, 100)
  const commentPagesPerPost = optNumber(opts, 'comment_pages_per_post', 1, 1, 20)
  const maxCommentRows = optNumber(opts, 'max_comment_rows', 1000, 1, 20000)
  const postScanLimit = optNumber(opts, 'comment_post_limit', posts.length || 25, 1, 2000)
  const rows: any[] = []
  const savedComments: any[] = []

  for (const post of posts.slice(0, postScanLimit)) {
    let data: any
    try {
      data = await graphGet(`${post.platform_post_id}/comments`, {
        limit: commentPageLimit,
        order: 'reverse_chronological',
        fields: 'id,message,from,created_time,like_count,comment_count,permalink_url,parent',
      }, token)
    } catch (e) {
        savedComments.push({ platform_post_id: post.platform_post_id, error: errorMessage(e) })
      continue
    }

    let pageNo = 0
    while (data?.data?.length && pageNo < commentPagesPerPost && rows.length < maxCommentRows) {
      pageNo += 1
      const comments = data.data || []
      for (const comment of comments) {
        if (rows.length >= maxCommentRows) break
        if (isBeforeSince(comment.created_time, sinceDate)) continue
        rows.push({
          connected_page_id: page.id,
          post_id: post.id,
          kenh: page.kenh || 'facebook',
          page_id: page.page_id,
          platform_comment_id: comment.id,
          platform_post_id: post.platform_post_id,
          parent_comment_id: comment.parent?.id || null,
          from_id: comment.from?.id || null,
          from_name: comment.from?.name || null,
          message: comment.message || null,
          comment_url: comment.permalink_url || null,
          created_time: comment.created_time || null,
          like_count: Number(comment.like_count || 0),
          comment_count: Number(comment.comment_count || 0),
          raw: comment,
          last_synced_at: new Date().toISOString(),
        })
      }
      if (hasOlderThanSince(comments, 'created_time', sinceDate)) break
      if (!data.paging?.next) break
      data = await graphUrlGet(data.paging.next)
    }
    if (rows.length >= maxCommentRows) break
  }

  if (rows.length > 0) {
    for (const batch of chunkRows(rows)) {
      const { data: inserted, error } = await supabase.from('marketing_page_comments')
        .upsert(batch, { onConflict: 'kenh,platform_comment_id' })
        .select('id')
      if (error) throw new Error(errorMessage(error))
      savedComments.push(...(inserted || []))
    }
  }
  return savedComments
}

async function syncConversations(page: ConnectedPage, token: string, opts: Record<string, any> = {}) {
  const sinceDate = optSinceDate(opts)
  const conversationLimit = Math.min(Math.max(Number(opts.conversation_limit || 25), 1), 500)
  const messagePageLimit = Math.min(Math.max(Number(opts.message_limit || 25), 1), 100)
  const messagePagesPerConversation = optNumber(opts, 'message_pages_per_conversation', 1, 1, 50)
  const maxMessagesPerConversation = optNumber(
    opts,
    'max_messages_per_conversation',
    messagePageLimit * messagePagesPerConversation,
    1,
    5000,
  )
  const maxPages = Math.min(Math.max(Number(opts.max_pages || 1), 1), 20)
  const maxRows = Math.min(Math.max(Number(opts.max_rows || 1000), 1), 20000)
  let conversations = await graphGet(`${page.page_id}/conversations`, {
    limit: Math.min(conversationLimit, 100),
    fields: 'id,updated_time,senders,message_count,unread_count',
  }, token)

  const rows: any[] = []
  let fetchedConversations = 0
  let pageNo = 0

  while (conversations?.data?.length && pageNo < maxPages && fetchedConversations < conversationLimit && rows.length < maxRows) {
    pageNo += 1
    for (const conversation of conversations.data || []) {
      if (fetchedConversations >= conversationLimit || rows.length >= maxRows) break
      fetchedConversations += 1
      if (sinceDate && conversation.updated_time && new Date(conversation.updated_time) < sinceDate) continue

      let messages: any
      try {
        messages = await graphGet(`${conversation.id}/messages`, {
          limit: messagePageLimit,
          fields: 'id,message,created_time,from,to,attachments',
        }, token)
      } catch (e) {
        rows.push({
          kenh: page.kenh || 'facebook',
          direction: 'internal',
          platform_message_id: `${conversation.id}:sync_error`,
          sender_type: 'system',
          sender_name: 'Meta Sync',
          noi_dung: errorMessage(e),
          attachments: [],
          trang_thai: 'failed',
          metadata: {
            page_id: page.page_id,
            page_name: page.page_name,
            conversation_id: conversation.id,
            raw_conversation: conversation,
          },
          created_at: new Date().toISOString(),
        })
        continue
      }

      let messagePageNo = 0
      let fetchedMessages = 0
      while (
        messages?.data?.length &&
        messagePageNo < messagePagesPerConversation &&
        fetchedMessages < maxMessagesPerConversation &&
        rows.length < maxRows
      ) {
        messagePageNo += 1
        const pageMessages = messages.data || []
        for (const message of pageMessages) {
          if (rows.length >= maxRows || fetchedMessages >= maxMessagesPerConversation) break
          fetchedMessages += 1
          if (isBeforeSince(message.created_time, sinceDate)) continue
          const isPageSender = message.from?.id === page.page_id
          rows.push({
            kenh: page.kenh || 'facebook',
            direction: isPageSender ? 'outbound' : 'inbound',
            platform_message_id: message.id,
            sender_type: isPageSender ? 'staff' : 'customer',
            sender_name: message.from?.name || null,
            noi_dung: message.message || '',
            attachments: message.attachments?.data || [],
            trang_thai: isPageSender ? 'sent' : 'received',
            sent_at: isPageSender ? message.created_time || null : null,
            metadata: {
              page_id: page.page_id,
              page_name: page.page_name,
              conversation_id: conversation.id,
              conversation_updated_time: conversation.updated_time || null,
              message_count: conversation.message_count || null,
              unread_count: conversation.unread_count || 0,
              to: message.to || null,
              raw_message: message,
              raw_conversation: conversation,
            },
            created_at: message.created_time || new Date().toISOString(),
          })
        }
        if (hasOlderThanSince(pageMessages, 'created_time', sinceDate)) break
        if (!messages.paging?.next) break
        messages = await graphUrlGet(messages.paging.next)
      }
  }

    if (!conversations.paging?.next) break
    conversations = await graphUrlGet(conversations.paging.next)
  }

  if (rows.length === 0) return []
  const savedRows: any[] = []
  for (const batch of chunkRows(rows)) {
    const { data: saved, error } = await supabase.from('marketing_messages')
      .upsert(batch, { onConflict: 'kenh,platform_message_id' })
      .select('id')
    if (error) throw new Error(errorMessage(error))
    savedRows.push(...(saved || []))
  }
  return savedRows
}

async function syncConversationsBatch(page: ConnectedPage, token: string, opts: Record<string, any> = {}) {
  const sinceDate = optSinceDate(opts)
  const key = cursorKey(opts)
  const cursor = conversationCursor(page, key)
  const resetCursor = opts.reset_cursor === true
  const conversationLimit = optNumber(opts, 'conversation_limit', 100, 1, 100)
  const conversationPageLimit = optNumber(opts, 'conversation_page_limit', 1, 1, 3)
  const messagePageLimit = optNumber(opts, 'message_limit', 25, 1, 100)
  const messagePagesPerConversation = optNumber(opts, 'message_pages_per_conversation', 1, 1, 5)
  const maxMessagesPerConversation = optNumber(
    opts,
    'max_messages_per_conversation',
    messagePageLimit * messagePagesPerConversation,
    1,
    500,
  )
  const maxRows = optNumber(opts, 'max_rows', 1500, 1, 5000)
  let after = resetCursor ? '' : String(opts.conversation_after || cursor.after || '')
  let done = false
  let stoppedBySinceDate = false
  let fetchedConversations = 0
  let scannedPages = 0

  const rows: any[] = []
  let conversations = await graphGet(`${page.page_id}/conversations`, {
    limit: conversationLimit,
    after: after || undefined,
    fields: 'id,updated_time,senders,message_count,unread_count',
  }, token)

  while (conversations?.data?.length && scannedPages < conversationPageLimit && rows.length < maxRows) {
    scannedPages += 1
    const pageConversations = conversations.data || []

    for (const conversation of pageConversations) {
      if (rows.length >= maxRows) break
      fetchedConversations += 1
      if (sinceDate && conversation.updated_time && new Date(conversation.updated_time) < sinceDate) continue

      let messages: any
      try {
        messages = await graphGet(`${conversation.id}/messages`, {
          limit: messagePageLimit,
          fields: 'id,message,created_time,from,to,attachments',
        }, token)
      } catch (e) {
        rows.push({
          kenh: page.kenh || 'facebook',
          direction: 'internal',
          platform_message_id: `${conversation.id}:sync_error`,
          sender_type: 'system',
          sender_name: 'Meta Sync',
          noi_dung: errorMessage(e),
          attachments: [],
          trang_thai: 'failed',
          metadata: {
            page_id: page.page_id,
            page_name: page.page_name,
            conversation_id: conversation.id,
            raw_conversation: conversation,
          },
          created_at: new Date().toISOString(),
        })
        continue
      }

      let messagePageNo = 0
      let fetchedMessages = 0
      while (
        messages?.data?.length &&
        messagePageNo < messagePagesPerConversation &&
        fetchedMessages < maxMessagesPerConversation &&
        rows.length < maxRows
      ) {
        messagePageNo += 1
        const pageMessages = messages.data || []
        for (const message of pageMessages) {
          if (rows.length >= maxRows || fetchedMessages >= maxMessagesPerConversation) break
          fetchedMessages += 1
          if (isBeforeSince(message.created_time, sinceDate)) continue
          const isPageSender = message.from?.id === page.page_id
          rows.push({
            kenh: page.kenh || 'facebook',
            direction: isPageSender ? 'outbound' : 'inbound',
            platform_message_id: message.id,
            sender_type: isPageSender ? 'staff' : 'customer',
            sender_name: message.from?.name || null,
            noi_dung: message.message || '',
            attachments: message.attachments?.data || [],
            trang_thai: isPageSender ? 'sent' : 'received',
            sent_at: isPageSender ? message.created_time || null : null,
            metadata: {
              page_id: page.page_id,
              page_name: page.page_name,
              conversation_id: conversation.id,
              conversation_updated_time: conversation.updated_time || null,
              message_count: conversation.message_count || null,
              unread_count: conversation.unread_count || 0,
              to: message.to || null,
              raw_message: message,
              raw_conversation: conversation,
            },
            created_at: message.created_time || new Date().toISOString(),
          })
        }
        if (hasOlderThanSince(pageMessages, 'created_time', sinceDate)) break
        if (!messages.paging?.next) break
        messages = await graphUrlGet(messages.paging.next)
      }
    }

    if (hasOlderThanSince(pageConversations, 'updated_time', sinceDate)) {
      done = true
      stoppedBySinceDate = true
      after = ''
      break
    }

    const nextAfter = conversations.paging?.cursors?.after || ''
    if (!conversations.paging?.next || !nextAfter) {
      done = true
      after = ''
      break
    }

    after = nextAfter
    if (scannedPages >= conversationPageLimit || rows.length >= maxRows) break
    conversations = await graphGet(`${page.page_id}/conversations`, {
      limit: conversationLimit,
      after,
      fields: 'id,updated_time,senders,message_count,unread_count',
    }, token)
  }

  if (!conversations?.data?.length) {
    done = true
    after = ''
  }

  const savedRows: any[] = []
  if (rows.length > 0) {
    for (const batch of chunkRows(rows)) {
      const { data: saved, error } = await supabase.from('marketing_messages')
        .upsert(batch, { onConflict: 'kenh,platform_message_id' })
        .select('id')
      if (error) throw new Error(errorMessage(error))
      savedRows.push(...(saved || []))
    }
  }

  await saveConversationCursor(page, {
    after: done ? null : after,
    done,
    stopped_by_since_date: stoppedBySinceDate,
    since_date: opts.since_date || null,
    last_batch: {
      fetched_conversations: fetchedConversations,
      scanned_pages: scannedPages,
      collected_messages: rows.length,
      saved_messages: savedRows.length,
      finished_at: new Date().toISOString(),
    },
  }, key)

  await supabase.from('marketing_automation_runs').insert({
    mode: 'meta_conversation_batch_sync',
    status: 'success',
    input_payload: {
      page_id: page.page_id,
      cursor_key: key,
      since_date: opts.since_date || null,
      conversation_limit: conversationLimit,
      conversation_page_limit: conversationPageLimit,
      message_limit: messagePageLimit,
      reset_cursor: resetCursor,
    },
    result_payload: {
      page_name: page.page_name,
      cursor_key: key,
      fetched_conversations: fetchedConversations,
      scanned_pages: scannedPages,
      collected_messages: rows.length,
      saved_messages: savedRows.length,
      done,
      stopped_by_since_date: stoppedBySinceDate,
      has_more: !done,
    },
  })

  return {
    page: page.page_name,
    cursor_key: key,
    fetched_conversations: fetchedConversations,
    scanned_pages: scannedPages,
    collected_messages: rows.length,
    saved_messages: savedRows.length,
    done,
    stopped_by_since_date: stoppedBySinceDate,
    has_more: !done,
    cursor_saved: !done,
  }
}

async function syncInsights(page: ConnectedPage, token: string) {
  const saved: any[] = []
  const metricDate = new Date().toISOString().slice(0, 10)
  const pageInfo = await graphGet(page.page_id, {
    fields: 'fan_count,followers_count,talking_about_count',
  }, token)

  const currentRows = [
    ['page_fan_count', pageInfo.fan_count],
    ['page_followers_count', pageInfo.followers_count],
    ['page_talking_about_count', pageInfo.talking_about_count],
  ].map(([metricName, value]) => ({
    connected_page_id: page.id,
    kenh: page.kenh || 'facebook',
    page_id: page.page_id,
    metric_name: metricName,
    period: 'day',
    metric_date: metricDate,
    value: Number(value || 0),
    raw: { source: 'page_fields', value },
  }))

  const { data: currentSaved, error: currentError } = await supabase.from('marketing_page_insights')
    .upsert(currentRows, { onConflict: 'kenh,page_id,metric_name,period,metric_date' })
    .select('id')
  if (currentError) throw currentError
  saved.push(...(currentSaved || []))

  for (const metric of PAGE_INSIGHT_METRICS) {
    try {
      const data = await graphGet(`${page.page_id}/insights/${metric}`, { period: 'day' }, token)
      const rows = (data.data || []).flatMap((m: any) =>
        (m.values || []).map((v: any) => ({
          connected_page_id: page.id,
          kenh: page.kenh || 'facebook',
          page_id: page.page_id,
          metric_name: m.name || metric,
          period: m.period || 'day',
          metric_date: String(v.end_time || '').slice(0, 10),
          value: typeof v.value === 'number' ? v.value : 0,
          raw: v,
        })),
      ).filter((r: any) => r.metric_date)
      if (rows.length === 0) continue
      const { data: inserted, error } = await supabase.from('marketing_page_insights')
        .upsert(rows, { onConflict: 'kenh,page_id,metric_name,period,metric_date' })
        .select('id')
      if (error) {
        saved.push({ metric, error: error.message })
        continue
      }
      saved.push(...(inserted || []))
    } catch (e) {
      saved.push({ metric, error: errorMessage(e) })
    }
  }
  return saved
}

async function syncOnePage(page: ConnectedPage, opts: Record<string, any> = {}) {
  const token = await getSecret(page.page_access_token_secret)
  if (!token) throw new Error(`Thieu Page Access Token cho ${page.page_name || page.page_id}`)

  const pageInfo = await upsertPage(page, token)
  const posts = await syncPosts(page, token, opts)
  const comments = await syncComments(page, token, posts, opts)
  const messages = await syncConversations(page, token, opts)
  const insights = await syncInsights(page, token)

  await supabase.from('marketing_automation_runs').insert({
    mode: 'meta_page_sync',
    status: 'success',
    input_payload: { page_id: page.page_id, sync_options: opts },
    result_payload: {
      page_name: pageInfo.name,
      posts: posts.length,
      comments: comments.length,
      messages: messages.length,
      insights: insights.length,
    },
  })

  return {
    page: pageInfo.name || page.page_name,
    posts: posts.length,
    comments: comments.length,
    messages: messages.length,
    insights: insights.length,
  }
}

async function syncConversationBatchForPage(page: ConnectedPage, opts: Record<string, any> = {}) {
  const token = await getSecret(page.page_access_token_secret)
  if (!token) throw new Error(`Thieu Page Access Token cho ${page.page_name || page.page_id}`)
  return syncConversationsBatch(page, token, opts)
}

async function connectPage(body: Record<string, unknown>) {
  const pageId = String(body.page_id || '').trim()
  const token = String(body.page_access_token || '').trim()
  if (!pageId) throw new Error('Thieu Page ID')
  if (!token) throw new Error('Thieu Page Access Token')

  const pageInfo = await graphGet(pageId, {
    fields: [
      'id',
      'name',
      'username',
      'link',
      'picture.type(large){url}',
      'cover{source}',
      'category',
      'about',
      'fan_count',
      'followers_count',
      'talking_about_count',
    ].join(','),
  }, token)

  const secretName = secretNameForPage(pageInfo.id || pageId)
  await saveTokenToVault(secretName, token)

  const { data: page, error } = await supabase.from('marketing_connected_pages').upsert({
    kenh: 'facebook',
    page_id: pageInfo.id || pageId,
    page_name: pageInfo.name || String(body.page_name || 'Fanpage'),
    username: pageInfo.username || null,
    page_url: pageInfo.link || null,
    avatar_url: pageInfo.picture?.data?.url || null,
    cover_url: pageInfo.cover?.source || null,
    category: pageInfo.category || null,
    about: pageInfo.about || null,
    fan_count: Number(pageInfo.fan_count || 0),
    followers_count: Number(pageInfo.followers_count || 0),
    talking_about_count: Number(pageInfo.talking_about_count || 0),
    page_access_token_secret: secretName,
    webhook_enabled: false,
    sync_enabled: true,
    ads_enabled: false,
    last_synced_at: new Date().toISOString(),
    metadata: {
      raw_page: pageInfo,
      connected_at: new Date().toISOString(),
      ads_note: 'Ads Automation chua bat',
      current_metrics: {
        fan_count: Number(pageInfo.fan_count || 0),
        followers_count: Number(pageInfo.followers_count || 0),
        talking_about_count: Number(pageInfo.talking_about_count || 0),
      },
    },
  }, { onConflict: 'kenh,page_id' })
    .select('id,kenh,page_id,page_name,page_access_token_secret,metadata')
    .single()

  if (error) throw new Error(errorMessage(error))
  const syncResult = await syncOnePage(page as ConnectedPage, body)

  return {
    connected: true,
    page: {
      id: pageInfo.id || pageId,
      name: pageInfo.name,
      link: pageInfo.link,
    },
    sync: syncResult,
  }
}

async function sendMessageFromPage(page: ConnectedPage, body: Record<string, unknown>) {
  const token = await getSecret(page.page_access_token_secret)
  if (!token) throw new Error(`Thieu Page Access Token cho ${page.page_name || page.page_id}`)

  const recipientId = String(body.recipient_id || body.platform_user_id || '').trim()
  const text = String(body.text || '').trim()
  const segmentId = String(body.segment_id || '').trim()
  if (!recipientId) throw new Error('Thieu nguoi nhan Fanpage')
  if (!text) throw new Error('Thieu noi dung tin nhan')

  const sent = await graphPost(`${page.page_id}/messages`, {
    recipient: { id: recipientId },
    messaging_type: 'RESPONSE',
    message: { text },
  }, token)

  await supabase.from('marketing_messages').insert({
    kenh: 'facebook',
    direction: 'outbound',
    platform_message_id: sent?.message_id || null,
    sender_type: 'staff',
    sender_name: page.page_name || 'Hannah Spa',
    noi_dung: text,
    trang_thai: 'sent',
    sent_at: new Date().toISOString(),
    metadata: {
      source: 'hsms_care_center',
      page_id: page.page_id,
      page_name: page.page_name,
      recipient_id: recipientId,
      segment_id: segmentId || null,
      raw_send_result: sent,
    },
  })

  if (segmentId) {
    await supabase.from('marketing_fanpage_customer_segments')
      .update({ care_status: 'dang_cham_soc' })
      .eq('id', segmentId)
  }

  return {
    ok: true,
    recipient_id: recipientId,
    message_id: sent?.message_id || null,
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    initSupabase(req)

    const body = await req.json().catch(() => ({}))
    const mode = String(body.mode || 'sync')
    if (mode === 'connect_page') {
      try {
        return json(await connectPage(body))
      } catch (e) {
        return json({ error: errorMessage(e), stage: 'connect_page' }, 500)
      }
    }

    const pageId = body.page_id ? String(body.page_id) : ''

    let query = supabase.from('marketing_connected_pages')
      .select('id,kenh,page_id,page_name,page_access_token_secret,metadata')
      .eq('kenh', 'facebook')
      .eq('sync_enabled', true)

    if (pageId) query = query.eq('page_id', pageId)

    const { data: pages, error } = await query
    if (error) throw new Error(errorMessage(error))
    if (!pages || pages.length === 0) return json({ ok: true, synced: 0, note: 'chua_co_fanpage_sync_enabled' })

    const results = []
    for (const page of pages as ConnectedPage[]) {
      try {
        if (mode === 'sync_conversations_batch') {
          results.push(await syncConversationBatchForPage(page, body))
        } else if (mode === 'send_message') {
          results.push(await sendMessageFromPage(page, body))
        } else {
          results.push(await syncOnePage(page, body))
        }
      } catch (e) {
        await supabase.from('marketing_automation_runs').insert({
          mode: mode === 'sync_conversations_batch' ? 'meta_conversation_batch_sync' : 'meta_page_sync',
          status: 'error',
          input_payload: { page_id: page.page_id },
          result_payload: {},
          error_message: errorMessage(e),
        })
        results.push({ page: page.page_name, error: errorMessage(e) })
      }
    }

    return json({ ok: true, synced: results.length, results })
  } catch (e) {
    await supabase.from('marketing_automation_runs').insert({
      mode: 'meta_page_sync',
      status: 'error',
      input_payload: {},
      result_payload: {},
      error_message: errorMessage(e),
    }).catch(() => {})
    return json({ error: errorMessage(e) }, 500)
  }
})

import axios from 'axios'
import { sliceHistory } from './utils/history'
import { useChatStore } from './store/chatStore'

export async function ask(nodeId: string, userMsg: string) {
  const { lastMsgs } = useChatStore.getState()

  const context = sliceHistory(
    lastMsgs(nodeId, 20).map(({ role, content }) => ({ role, content }))
  )

  const { data } = await axios.post('/ask', { msg: userMsg, context }, {
    headers: { 'X-API-Key': import.meta.env.VITE_BACKEND_KEY ?? 'dev-secret' },
  })

  return data.answer as string
}

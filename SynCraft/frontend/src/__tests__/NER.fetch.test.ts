import { describe, it, expect, vi } from 'vitest'
import axios from 'axios'
import { fetchEntities } from '../utils/ner'

vi.mock('axios')
const mocked = axios as unknown as { post: any }

describe('fetchEntities', () => {
  it('calls /ask/ner and returns list', async () => {
    mocked.post = vi.fn().mockResolvedValue({
      data: { entities: [{ text: 'AI', label: 'ORG' }] }
    })
    const ents = await fetchEntities('AI')
    expect(ents).toEqual([{ text: 'AI', label: 'ORG' }])
    expect(mocked.post).toHaveBeenCalledWith('/ask/ner', { text: 'AI' })
  })
})

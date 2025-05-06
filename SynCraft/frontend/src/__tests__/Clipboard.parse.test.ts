import { parseClipboard } from '../utils/clipboard'

describe('parseClipboard', () => {
  it('splits url & text lines', () => {
    const clip = `
      https://openai.com
      - first bullet
      * second
      plain line
    `
    expect(parseClipboard(clip)).toEqual([
      { type: 'url',  value: 'https://openai.com' },
      { type: 'text', value: 'first bullet' },
      { type: 'text', value: 'second' },
      { type: 'text', value: 'plain line' },
    ])
  })
})

import axios from 'axios'
export interface Entity { text: string; label: string }
export const fetchEntities = async (text: string) => {
  const { data } = await axios.post('/ask/ner', { text })
  return data.entities as Entity[]
}

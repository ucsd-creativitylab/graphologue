import { v5 as uuidv5 } from 'uuid'

export const getPasswordNow = (): string => {
  // use uuidv5 to generate a password based on the current year, month, day, hour
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const day = now.getDate()
  const hour = now.getHours()

  const password = uuidv5(
    `Creativity-${year}-${month}-${day}-${hour}`,
    uuidv5.URL
  )

  return password
}

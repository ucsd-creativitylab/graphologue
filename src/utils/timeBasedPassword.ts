import { v5 as uuidv5 } from 'uuid'

export const getPasswordNow = (): string => {
  // use uuidv5 to generate a password based on the current year, month, day, hour
  // the time should be in UTC
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1
  const day = now.getUTCDate()
  const hour = now.getUTCHours()

  const password = uuidv5(
    `Creativity-${year}-${month}-${day}-${hour}`,
    uuidv5.URL,
  )

  return password
}

export const checkUserPermission = (userName: string) => {
  switch (userName) {
    case 'haijunx':
      return true
    case 'sun':
      // if the Date.now is before June 18th, 2023 then return true
      // otherwise return false
      return Date.now() < new Date('2023-06-18').getTime()
  }

  return false
}

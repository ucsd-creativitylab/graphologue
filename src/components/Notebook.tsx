import { memo, useCallback } from 'react'

import ClearRoundedIcon from '@mui/icons-material/ClearRounded'
// import BookRoundedIcon from '@mui/icons-material/BookRounded'

export interface Note {}

export interface NoteBookProps {
  notes: Note[]
  setNotes: (notes: Note[]) => void
  notesOpened: boolean
  setNotesOpened: (notesOpened: boolean) => void
}

export const NoteBook = memo(
  ({ notes, setNotes, notesOpened, setNotesOpened }: NoteBookProps) => {
    const handleCloseNotebook = useCallback(() => {
      setNotesOpened(false)
    }, [setNotesOpened])

    return (
      <div
        className="notebook"
        style={{
          right: notesOpened ? 0 : '-25rem',
        }}
      >
        <div className="notebook-bar">
          <div className="bar-buttons">
            <button className="bar-button" onClick={handleCloseNotebook}>
              <ClearRoundedIcon />
            </button>
          </div>
          <h1 className="notebook-title">
            {/* <BookRoundedIcon /> */}
            <span>notebook</span>
          </h1>
        </div>
      </div>
    )
  }
)

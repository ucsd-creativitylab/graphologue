import { memo, useCallback, useContext } from 'react'
import isEqual from 'react-fast-compare'

import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'

import { VerifyEntities, MagicNode } from '../componentsFlow/MagicNode'
import { NotebookContext } from './Contexts'
import { slowInteractionWaitTimeout } from '../constants'

export type NoteType = 'magic'

export interface MagicNoteData {
  id: string
  magicNodeId: string
  prompt: string
  response: string
  verifyEntities: VerifyEntities
}

export interface MagicNote {
  type: 'magic'
  id: string
  data: MagicNoteData
}

export type Note = MagicNote

export interface NoteBookProps {
  notebookRef: React.RefObject<HTMLDivElement>
}

export const NoteBook = memo(({ notebookRef }: NoteBookProps) => {
  const { setNotes, notesOpened, setNotesOpened } = useContext(NotebookContext)

  const handleCloseNotebook = useCallback(() => {
    setNotesOpened(false)
  }, [setNotesOpened])

  const handleClearNotebook = useCallback(() => {
    setNotes([])
    setTimeout(() => setNotesOpened(false), slowInteractionWaitTimeout)
  }, [setNotes, setNotesOpened])

  const handleDownloadNotebook = useCallback(() => {}, [])

  return (
    <div
      ref={notebookRef}
      className="notebook"
      style={{
        right: notesOpened ? 0 : '-25rem',
      }}
    >
      <div className="notebook-bar">
        <h1 className="notebook-title">
          {/* <BookRoundedIcon /> */}
          <span>graphonote</span>
        </h1>
        <div className="bar-buttons">
          <button className="bar-button" onClick={handleDownloadNotebook}>
            <DownloadRoundedIcon />
          </button>
          <button className="bar-button" onClick={handleClearNotebook}>
            <DeleteOutlineRoundedIcon
              style={{
                transform: 'scale(1.1)',
              }}
            />
          </button>
          <button className="bar-button" onClick={handleCloseNotebook}>
            <ArrowForwardIosRoundedIcon />
          </button>
        </div>
      </div>
      <CustomNotes />
    </div>
  )
})

const CustomNotes = () => {
  const { notes } = useContext(NotebookContext)

  return (
    <div className="notebook-notes">
      {notes.map(note => {
        switch (note.type) {
          case 'magic':
            return <MagicNoteComponent key={note.id} note={note} />
          default:
            return null
        }
      })}
    </div>
  )
}

const MagicNoteComponent = memo(
  ({ note: { id, data } }: { note: MagicNote }) => {
    return (
      <div className="custom-note magic-note">
        <MagicNode
          id={id}
          data={{
            prompt: data.prompt,
            suggestedPrompts: [],
            sourceComponents: {
              nodes: [],
              edges: [],
            },
            rawResponse: '',
            rawLinks: [],
            rawGraphRelationships: [],
          }}
          magicNoteInNotebook={true}
          magicNoteData={data}
          ////
          type="magic"
          selected={false}
          zIndex={0}
          isConnectable={false}
          xPos={0}
          yPos={0}
          dragging={false}
        />
      </div>
    )
  },
  isEqual
)

/* -------------------------------------------------------------------------- */

export const deepCopyNote = (note: Note): Note => {
  if (note.type === 'magic') {
    return {
      ...note,
      data: {
        ...note.data,
        verifyEntities: {
          searchQueries: [...note.data.verifyEntities.searchQueries],
          researchPapers: JSON.parse(
            JSON.stringify(note.data.verifyEntities.researchPapers)
          ),
        },
      },
    } as MagicNote
  }

  return note
}

export const deepCopyNotes = (notes: Note[]): Note[] => {
  return notes.map(deepCopyNote)
}

import { createActor } from 'xstate'
import { describe, expect, it } from 'vitest'
import { canvasEditorMachine } from './canvasEditor.machine'

describe('canvasEditorMachine', () => {
  it('초기: tool select / imageTab upload / idle', () => {
    const s = createActor(canvasEditorMachine).start().getSnapshot()
    expect(s.context.tool).toBe('select')
    expect(s.context.imageTab).toBe('upload')
    expect(s.value).toBe('idle')
  })

  it('SET_TOOL → tool 변경(전역, 어느 상태든)', () => {
    const a = createActor(canvasEditorMachine).start()
    a.send({ type: 'SET_TOOL', tool: 'draw' })
    expect(a.getSnapshot().context.tool).toBe('draw')
    a.send({ type: 'SET_TOOL', tool: 'image' })
    expect(a.getSnapshot().context.tool).toBe('image')
  })

  it('SET_IMAGE_TAB → imageTab 변경', () => {
    const a = createActor(canvasEditorMachine).start()
    a.send({ type: 'SET_IMAGE_TAB', tab: 'sticker' })
    expect(a.getSnapshot().context.imageTab).toBe('sticker')
  })

  it('UPLOAD_START → uploading → UPLOAD_DONE → idle', () => {
    const a = createActor(canvasEditorMachine).start()
    a.send({ type: 'UPLOAD_START' })
    expect(a.getSnapshot().value).toBe('uploading')
    a.send({ type: 'UPLOAD_DONE' })
    expect(a.getSnapshot().value).toBe('idle')
  })

  it('업로드 중에도 SET_TOOL 가능(전역 on, 업로드 상태 유지)', () => {
    const a = createActor(canvasEditorMachine).start()
    a.send({ type: 'UPLOAD_START' })
    a.send({ type: 'SET_TOOL', tool: 'text' })
    expect(a.getSnapshot().value).toBe('uploading')
    expect(a.getSnapshot().context.tool).toBe('text')
  })
})

import { useContext, useState } from 'react'
import Keyboard from 'react-simple-keyboard'
import { KboardContext } from '../context/KboardContext'

const TEXT_LAYOUT = {
  default: [
    'q w e r t y u i o p',
    'a s d f g h j k l',
    '{shift} z x c v b n m {bksp}',
    '{numbers} {space} {done}'
  ],
  shift: [
    'Q W E R T Y U I O P',
    'A S D F G H J K L',
    '{shift} Z X C V B N M {bksp}',
    '{numbers} {space} {done}'
  ],
  numbers: [
    '1 2 3 4 5 6 7 8 9 0',
    '- / : ; ( ) $ & @ "',
    ". , ? ! ' {bksp}",
    '{abc} {space} {done}'
  ]
}

const NUMERIC_LAYOUT = {
  default: ['1 2 3', '4 5 6', '7 8 9', '{bksp} 0 {done}']
}

export default function VirtualKeyboard() {
  const kb = useContext(KboardContext)
  const [layoutName, setLayoutName] = useState('default')

  if (!kb?.visible) return null

  const handleKeyPress = (button) => {
    if (button === '{shift}') {
      setLayoutName(n => n === 'default' ? 'shift' : 'default')
    } else if (button === '{numbers}') {
      setLayoutName('numbers')
    } else if (button === '{abc}') {
      setLayoutName('default')
    } else if (button === '{done}') {
      setLayoutName('default')
      kb.dismiss()
    } else if (layoutName === 'shift' && button !== '{bksp}') {
      setLayoutName('default')
    }
  }

  const isNumeric = kb.mode === 'numeric'

  return (
    <div
      className={`fixed bottom-0 z-[200] bg-slate-900 border-t border-white/10
        ${isNumeric ? 'left-1/2 -translate-x-1/2 w-56' : 'left-0 right-0'}`}
      onMouseDown={e => e.preventDefault()}
    >
      <Keyboard
        keyboardRef={r => {
          kb.keyboardRef.current = r
          if (r) r.setInput(kb.initValue ?? '')
        }}
        onChange={kb.handleKeyboard}
        onKeyPress={handleKeyPress}
        layout={isNumeric ? NUMERIC_LAYOUT : TEXT_LAYOUT}
        layoutName={layoutName}
        theme="hg-theme-default kboard-dark"
        display={{
          '{bksp}':    '⌫',
          '{shift}':   '⇧',
          '{space}':   'Space',
          '{done}':    'Done ✓',
          '{numbers}': '123',
          '{abc}':     'ABC'
        }}
      />
    </div>
  )
}

import Game from './components/Game'
import { createGlobalStyle } from 'styled-components'

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    background-color: black;
  }
`

function App() {
  return (
    <>
      <GlobalStyle />
      <Game />
    </>
  )
}

export default App

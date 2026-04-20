
# File 4: src/main.jsx
main_jsx = '''import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)'''

with open(f'{base_path}/src/main.jsx', 'w') as f:
    f.write(main_jsx)

print("✓ src/main.jsx")
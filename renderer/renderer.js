const webview = document.getElementById('bowlrms-view')

document.getElementById('back').addEventListener('click', () => {
  if (webview.canGoBack()) webview.goBack()
})

document.getElementById('forward').addEventListener('click', () => {
  if (webview.canGoForward()) webview.goForward()
})

document.getElementById('home').addEventListener('click', () => {
  webview.loadURL('https://beta.bowlrms.com')
})

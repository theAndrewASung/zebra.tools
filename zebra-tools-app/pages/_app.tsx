import '../styles/globals.css'
import type { AppProps } from 'next/app'

import { PageFrame } from './components/page-frame';

function ZebraApp({ Component, pageProps }: AppProps) {
  return (
    <PageFrame>
      <Component {...pageProps} />
    </PageFrame>
  )
}

export default ZebraApp

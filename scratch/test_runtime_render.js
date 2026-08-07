import React from 'react'
import { renderToString } from 'react-dom/server'
import WalletHeaderCard from '../src/components/wallet/WalletHeaderCard.jsx'
import QuickActionsGrid from '../src/components/wallet/QuickActionsGrid.jsx'
import TransactionListPro from '../src/components/wallet/TransactionListPro.jsx'
import QRCodeModal from '../src/components/wallet/QRCodeModal.jsx'
import EscrowBreakdownModal from '../src/components/wallet/EscrowBreakdownModal.jsx'

console.log('Testing React Server Component Render of Wallet components...')

try {
  const h1 = renderToString(React.createElement(WalletHeaderCard, { wallet: { balance_available: 5000, wallet_number: '1234567890' }, pieces: { balance: 100 } }))
  console.log('✓ WalletHeaderCard rendered, length:', h1.length)
} catch (e) {
  console.error('❌ WalletHeaderCard Error:', e)
}

try {
  const h2 = renderToString(React.createElement(QuickActionsGrid, {}))
  console.log('✓ QuickActionsGrid rendered, length:', h2.length)
} catch (e) {
  console.error('❌ QuickActionsGrid Error:', e)
}

try {
  const h3 = renderToString(React.createElement(TransactionListPro, { transactions: [] }))
  console.log('✓ TransactionListPro rendered, length:', h3.length)
} catch (e) {
  console.error('❌ TransactionListPro Error:', e)
}

try {
  const h4 = renderToString(React.createElement(QRCodeModal, { open: true, wallet: { wallet_number: '1234567890' } }))
  console.log('✓ QRCodeModal rendered, length:', h4.length)
} catch (e) {
  console.error('❌ QRCodeModal Error:', e)
}

try {
  const h5 = renderToString(React.createElement(EscrowBreakdownModal, { open: true, wallet: { balance_reserved: 1000 } }))
  console.log('✓ EscrowBreakdownModal rendered, length:', h5.length)
} catch (e) {
  console.error('❌ EscrowBreakdownModal Error:', e)
}

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate')
  return res.status(200).json({
    status: 'ok',
    app: 'Ctrl+Savings',
    message: 'Vercel Serverless Function active and responsive.',
    timestamp: new Date().toISOString(),
  })
}

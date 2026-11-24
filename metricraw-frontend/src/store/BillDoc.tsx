import { money, num } from '../dashboard/util'
import type { Order } from '../dashboard/types'
import { payLabel } from './helpers'

function when(s: string) {
  return new Date(s).toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function BillDoc({ o }: { o: Order }) {
  return (
    <article className="st-bill" id="bill">
      <header className="st-billhead">
        <div>
          <div className="st-flogo">Metric<em>Raw</em></div>
          <p className="st-fsmall">Fitness store · Track. Train. Transform.</p>
        </div>
        <div className="st-billmeta">
          <b>Bill</b>
          <span>No. MR-{String(o.id).padStart(4, '0')}</span>
          <span>{when(o.created_at)}</span>
          <span className="st-chip">{o.status}</span>
        </div>
      </header>

      <div className="st-billgrid">
        <div>
          <h3>Bill to</h3>
          <p>{o.billing_address || o.shipping_address || '—'}</p>
        </div>
        <div>
          <h3>Ship to</h3>
          <p>{o.shipping_address || '—'}</p>
        </div>
        <div>
          <h3>Payment</h3>
          <p>{payLabel(o.payment_method)}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr>
        </thead>
        <tbody>
          {o.items.map((i) => {
            const line = (num(i.unit_price) ?? 0) * i.quantity
            return (
              <tr key={i.id}>
                <td>{i.product_name}</td>
                <td>{i.quantity}</td>
                <td>{money(i.unit_price)}</td>
                <td>{money(line)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="st-billtot">
        <span>Total</span>
        <strong>{money(o.total)}</strong>
      </div>
      <p className="st-billnote">This is a computer-generated bill. Keep it for your records.</p>
    </article>
  )
}

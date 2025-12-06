import BaseLineItemsTable from '@/components/BaseLineItemsTable'

function LineItems() {
  return (
    <div className='container h-full flex flex-col'>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Line Items</h1>
      </div>

      <BaseLineItemsTable mode="global" />
    </div>
  )
}

export default LineItems

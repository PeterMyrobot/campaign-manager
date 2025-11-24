import { useCampaigns } from '@/hooks/useCampaigns'
import {Button} from '@/components/ui/button'

function Campaigns() {

  const {data: campaigns = []} = useCampaigns()

  console.log(campaigns)
  return (
    <div className='container'>
      Campaigns
      <Button>Button</Button>
    </div>
  )
}

export default Campaigns
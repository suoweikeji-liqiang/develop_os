import { Html, Body, Container, Text, Link } from '@react-email/components'

interface Props {
  requirementTitle: string
  fromStatus: string
  toStatus: string
  changedBy: string
  requirementUrl: string
}

export function StatusChangeEmailTemplate({ requirementTitle, fromStatus, toStatus, changedBy, requirementUrl }: Props) {
  return (
    <Html>
      <Body style={{ fontFamily: 'sans-serif', padding: '20px' }}>
        <Container>
          <Text style={{ fontSize: '16px', marginBottom: '8px' }}>
            需求 &ldquo;{requirementTitle}&rdquo; 状态已变更
          </Text>
          <Text style={{ color: '#555', marginBottom: '16px' }}>
            {changedBy} 将状态从 <strong>{fromStatus}</strong> 更新为 <strong>{toStatus}</strong>
          </Text>
          <Link href={requirementUrl} style={{ color: '#2563eb' }}>
            查看需求
          </Link>
        </Container>
      </Body>
    </Html>
  )
}

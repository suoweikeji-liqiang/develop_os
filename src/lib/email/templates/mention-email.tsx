import { Html, Body, Container, Text, Link } from '@react-email/components'

interface Props {
  mentionedBy: string
  requirementTitle: string
  commentPreview: string
  requirementUrl: string
}

export function MentionEmailTemplate({ mentionedBy, requirementTitle, commentPreview, requirementUrl }: Props) {
  return (
    <Html>
      <Body style={{ fontFamily: 'sans-serif', padding: '20px' }}>
        <Container>
          <Text style={{ fontSize: '16px', marginBottom: '8px' }}>
            <strong>{mentionedBy}</strong> 在需求 &ldquo;{requirementTitle}&rdquo; 中提到了你
          </Text>
          <Text style={{ color: '#555', marginBottom: '16px' }}>
            &ldquo;{commentPreview.slice(0, 200)}&rdquo;
          </Text>
          <Link href={requirementUrl} style={{ color: '#2563eb' }}>
            查看需求
          </Link>
        </Container>
      </Body>
    </Html>
  )
}

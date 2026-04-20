import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface WinbackReengageProps {
  firstName?: string
  studioName?: string
  bookingUrl?: string
}

const WinbackReengageEmail = ({
  firstName,
  studioName = 'your studio',
  bookingUrl = 'https://kinspace.studio',
}: WinbackReengageProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We miss you at {studioName} — your spot is waiting</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {firstName ? `Hi ${firstName},` : 'Hi there,'}
        </Heading>
        <Text style={text}>
          We miss you at <strong>{studioName}</strong>! It's been a while
          since your last class — and your spot on the schedule is waiting.
        </Text>
        <Text style={text}>
          Come back this week and rediscover what brought you in.
        </Text>
        <Section style={buttonContainer}>
          <Button href={bookingUrl} style={button}>
            Book your next class
          </Button>
        </Section>
        <Text style={footer}>
          See you on the mat,<br />The {studioName} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WinbackReengageEmail,
  subject: (data: Record<string, any>) =>
    `We miss you at ${data?.studioName || 'the studio'}`,
  displayName: 'Win-back / Re-engage',
  previewData: {
    firstName: 'Jamie',
    studioName: 'Kinspace Downtown',
    bookingUrl: 'https://kinspace.studio/book/downtown',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1 = {
  fontSize: '24px',
  fontWeight: 600,
  color: '#1a1a1a',
  margin: '0 0 24px',
  letterSpacing: '-0.01em',
}
const text = {
  fontSize: '15px',
  color: '#4a4a4a',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const buttonContainer = { margin: '32px 0' }
const button = {
  backgroundColor: '#1a1a1a',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 500,
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = {
  fontSize: '13px',
  color: '#888888',
  margin: '40px 0 0',
  lineHeight: '1.6',
}

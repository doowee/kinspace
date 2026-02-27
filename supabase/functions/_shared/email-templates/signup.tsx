/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to Kinspace.Studio — confirm your email</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://rkwwoefndegyuoyoaukz.supabase.co/storage/v1/object/public/email-assets/kinspace-logo.png"
          alt="Kinspace.Studio"
          width="48"
          height="48"
          style={logo}
        />
        <Heading style={h1}>Welcome aboard</Heading>
        <Text style={text}>
          We're thrilled you're joining{' '}
          <Link href={siteUrl} style={link}>
            <strong>Kinspace.Studio</strong>
          </Link>
          ! Confirm your email to get started.
        </Text>
        <Text style={text}>
          Your email:{' '}
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm My Email
        </Button>
        <Text style={footer}>
          Didn't sign up? You can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logo = { marginBottom: '24px', borderRadius: '12px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  fontFamily: "'Playfair Display', Georgia, serif",
  color: '#1a1f1a',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#737373',
  lineHeight: '1.6',
  margin: '0 0 24px',
}
const link = { color: '#1a1f1a', textDecoration: 'underline' }
const button = {
  backgroundColor: '#1a1f1a',
  color: '#f7f7f6',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '12px',
  padding: '14px 24px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#a3a3a3', margin: '32px 0 0' }

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'

export default function SSOCallbackPage() {
  return (
    <>
      <AuthenticateWithRedirectCallback 
        continueSignUpUrl="/"
        afterSignInUrl="/"
        afterSignUpUrl="/"
      />
      {/* Required for sign-up flows - Clerk's bot sign-up protection is enabled by default */}
      <div id="clerk-captcha" />
    </>
  )
}


import React from "react"
import { Box, Button, FormGroup, H5, Input, Label, MessageBox, Text } from "@adminjs/design-system"
import { styled } from "@adminjs/design-system/styled-components"

const Wrapper = styled(Box)`
  align-items: center;
  justify-content: center;
  flex-direction: column;
  min-height: 100%;
`

const StyledLogo = styled.img`
  max-width: 260px;
  margin: 0 auto;
  display: block;
`

const Header = styled.div`
  text-align: center;
  font-size: 1.5rem; /* ~text-2xl */
  font-weight: 800; /* font-extrabold */
  color: #d60000;
  margin-bottom: ${({ theme }) => theme.space.md};
`

const LetterRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 2px;
  margin-bottom: ${({ theme }) => theme.space.xl};
`

const LetterBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  width: 18px;
  border: 1px solid #d60000;
  border-radius: 3px;
  font-family: "IBM Plex Mono", monospace;
  font-size: 11px;
  font-weight: 700;
  color: #d60000;
`

const RedButton = styled(Button)`
  background-color: #d60000 !important;
  border-color: #d60000 !important;
  &:hover {
    background-color: #b00000 !important;
    border-color: #b00000 !important;
  }
`

const RequiredLabel = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 4px;
  .asterisk {
    color: #d60000;
    margin-right: 4px;
  }
`

// Custom lightweight login without the left illustration or footer
const CustomLogin: React.FC = () => {
  const props = (window as any).__APP_STATE__
  const { action, errorMessage: message, branding } = props

  return (
    <Wrapper flex variant="grey" className="login__Wrapper">
      <Box
        as="form"
        action={action}
        method="POST"
        bg="white"
        p="x4"
        boxShadow="login"
        width={["100%", "480px"]}
      >
        <Header>CyberWordament WareHouse</Header>
        <LetterRow>
          {"CYBERWORDAMENT".split("").map((letter, idx) => (
            <LetterBox key={`${letter}-${idx}`}>{letter}</LetterBox>
          ))}
        </LetterRow>
        <H5 marginBottom="xxl" textAlign="center">
          {branding?.logo ? <StyledLogo src={branding.logo} alt={branding.companyName} /> : branding?.companyName}
        </H5>
        {message && (
          <MessageBox my="lg" message={message} variant="danger" />
        )}
        <FormGroup>
          <RequiredLabel>
            <span className="asterisk">*</span>Email
          </RequiredLabel>
          <Input name="email" placeholder="Email" />
        </FormGroup>
        <FormGroup>
          <RequiredLabel>
            <span className="asterisk">*</span>Password
          </RequiredLabel>
          <Input type="password" name="password" placeholder="Password" autoComplete="new-password" />
        </FormGroup>
        <Text mt="xl" textAlign="center">
          <RedButton variant="contained">Login</RedButton>
        </Text>
      </Box>
    </Wrapper>
  )
}

export default CustomLogin

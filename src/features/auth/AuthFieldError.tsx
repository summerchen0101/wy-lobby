type Props = {
  message?: string | null
  variant: 'modal' | 'page'
}

export function AuthFieldError({ message, variant }: Props) {
  if (!message) return null
  const className =
    variant === 'modal' ? 'auth-modal__field-error' : 'auth-form__field-error'
  return <p className={className}>{message}</p>
}

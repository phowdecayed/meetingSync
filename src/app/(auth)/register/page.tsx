import dynamic from 'next/dynamic'

const RegisterPage = dynamic(
  () => import('@/components/auth-components/RegisterPage'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center">
        <span>Memuat...</span>
      </div>
    ),
  },
)

export default RegisterPage

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

function formatAuthError(error: any): string {
  if (!error) return '알 수 없는 오류가 발생했습니다.'
  const message = error.message || String(error)

  if (
    message.includes('fetch failed') ||
    error.code === 'ENOTFOUND' ||
    error.name === 'TypeError'
  ) {
    return '데이터베이스 서버에 연결할 수 없습니다. Supabase 프로젝트가 일시 정지(Paused) 상태인지 확인해주세요.'
  }

  if (message.includes('Invalid login credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.'
  }

  if (message.includes('Email not confirmed')) {
    return '이메일 인증이 완료되지 않았습니다. 수신함을 확인해주세요.'
  }

  if (message.includes('User already registered')) {
    return '이미 등록된 이메일 계정입니다.'
  }

  if (message.includes('Password should be at least')) {
    return '비밀번호는 최소 6자 이상이어야 합니다.'
  }

  return message
}

export async function login(formData: FormData) {
  let targetUrl = '/'

  try {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
      targetUrl = `/login?error=${encodeURIComponent('이메일과 비밀번호를 모두 입력해주세요.')}`
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        console.error('Login error', error)
        targetUrl = `/login?error=${encodeURIComponent(formatAuthError(error))}`
      } else {
        revalidatePath('/', 'layout')
      }
    }
  } catch (err: any) {
    console.error('Unexpected login error', err)
    targetUrl = `/login?error=${encodeURIComponent(formatAuthError(err))}`
  }

  redirect(targetUrl)
}

export async function signup(formData: FormData) {
  let targetUrl = '/'

  try {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
      targetUrl = `/login?error=${encodeURIComponent('이메일과 비밀번호를 모두 입력해주세요.')}`
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        console.error('Signup error', error)
        targetUrl = `/login?error=${encodeURIComponent(formatAuthError(error))}`
      } else if (data.user && !data.session) {
        targetUrl = `/login?message=${encodeURIComponent('회원가입 인증 메일을 보냈습니다. 이메일 링크를 확인해주세요.')}`
      } else {
        revalidatePath('/', 'layout')
      }
    }
  } catch (err: any) {
    console.error('Unexpected signup error', err)
    targetUrl = `/login?error=${encodeURIComponent(formatAuthError(err))}`
  }

  redirect(targetUrl)
}

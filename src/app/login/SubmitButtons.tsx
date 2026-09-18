'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { login, signup } from './actions'

export function SubmitButtons() {
  const { pending } = useFormStatus()

  return (
    <div className="mt-6 flex flex-col gap-3">
      <button
        formAction={login}
        disabled={pending}
        className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/60 disabled:text-blue-200 disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
      >
        {pending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>로그인 처리 중...</span>
          </>
        ) : (
          'Log in'
        )}
      </button>
      <button
        formAction={signup}
        disabled={pending}
        className="w-full py-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900/60 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-300 font-medium border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
      >
        {pending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>가입 처리 중...</span>
          </>
        ) : (
          'Sign up'
        )}
      </button>
    </div>
  )
}

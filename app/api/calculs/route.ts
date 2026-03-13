import { NextRequest, NextResponse } from 'next/server'
import { calculerCashflow } from '@/lib/calculs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bien, financement, fiscal } = body

    if (!bien || !financement || !fiscal) {
      return NextResponse.json(
        { error: 'Paramètres manquants : bien, financement, fiscal requis' },
        { status: 400 }
      )
    }

    const resultat = calculerCashflow(bien, financement, fiscal)

    return NextResponse.json({ resultat })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur calcul' }, { status: 500 })
  }
}
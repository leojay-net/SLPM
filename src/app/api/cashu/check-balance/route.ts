import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    return NextResponse.json({
        error: 'Not implemented'
    }, { status: 501 });
}

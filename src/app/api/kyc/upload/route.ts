import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/middleware';
import supabaseAdmin from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { file, folder } = body;
    let url = file || '/uploads/doc-placeholder.png';

    // If file is base64 data URL and Supabase storage is configured, attempt upload
    if (typeof file === 'string' && file.startsWith('data:')) {
      try {
        const matches = file.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const contentType = matches[1];
          const ext = contentType.split('/')[1] || 'png';
          const buffer = Buffer.from(matches[2], 'base64');
          const cleanFolder = (folder || 'kyc').replace(/[^a-zA-Z0-9_\-\/]/g, '_');
          const filePath = `${cleanFolder}/${Date.now()}.${ext}`;

          const { data, error } = await supabaseAdmin.storage
            .from('documents')
            .upload(filePath, buffer, {
              contentType,
              upsert: true,
            });

          if (!error && data) {
            const { data: pubData } = supabaseAdmin.storage
              .from('documents')
              .getPublicUrl(filePath);
            if (pubData?.publicUrl) {
              url = pubData.publicUrl;
            }
          }
        }
      } catch (err) {
        // Fallback to the base64 string
      }
    }

    return NextResponse.json({
      success: true,
      url,
      data: { url },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Upload failed' }, { status: 500 });
  }
}

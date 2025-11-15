// app/api/gdpr/log-consent/route.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { email, ipAddress, userAgent } = await request.json();

    if (!email) {
      return Response.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('gdpr_consent_logs')
      .insert({
        email,
        consent_type: 'privacy_policy',
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (error) {
      console.error('GDPR log error:', error);
      return Response.json(
        { error: 'Failed to log consent' },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
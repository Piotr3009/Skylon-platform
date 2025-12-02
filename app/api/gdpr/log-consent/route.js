// app/api/gdpr/log-consent/route.js

import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase credentials not configured');
  }
  
  return createClient(url, key);
};

export async function POST(request) {
  try {
    const supabase = getSupabase();
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
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password, fullName, phone, role } = await req.json();

    // Create admin client using the service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 1. Create the user with email_confirm = true (Bypasses email limits!)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (authData?.user) {
      // 2. Save profile in the profiles table
      const { error: profileError } = await supabaseAdmin.from("profiles").insert([
        {
          id: authData.user.id,
          full_name: fullName,
          role: role,
          phone: phone,
        },
      ]);

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, role });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create account" }, { status: 500 });
  }
}
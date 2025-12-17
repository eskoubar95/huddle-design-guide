import { NextRequest } from "next/server";
import { query } from "@/lib/db/postgres-connection";

export async function GET() {
  try {
    // Check table columns
    const columns = await query<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>(`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'shipping_addresses'
      ORDER BY ordinal_position;
    `);

    // Check if required columns exist
    const hasState = columns.some((c) => c.column_name === 'state');
    const hasAddressLine2 = columns.some((c) => c.column_name === 'address_line_2');

    // Get recent addresses count
    const recentCount = await query<{ count: string }>(`
      SELECT COUNT(*) as count
      FROM public.shipping_addresses;
    `);

    return Response.json({
      success: true,
      columns: columns.map((c) => ({
        name: c.column_name,
        type: c.data_type,
        nullable: c.is_nullable === 'YES',
      })),
      checks: {
        state: hasState ? '✅ EXISTS' : '❌ MISSING',
        address_line_2: hasAddressLine2 ? '✅ EXISTS' : '❌ MISSING',
      },
      totalAddresses: parseInt(recentCount[0]?.count || '0', 10),
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

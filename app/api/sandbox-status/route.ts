import { NextRequest, NextResponse } from 'next/server';
import { sandboxManager } from '@/lib/sandbox/sandbox-manager';

declare global {
  var activeSandboxProvider: any;
  var sandboxData: any;
  var existingFiles: Set<string>;
}

export async function GET(request: NextRequest) {
  try {
    // getSandboxInfo() only reads server memory, so a sandbox that E2B already
    // reaped still reports healthy. ?probe=1 does a real round trip - required
    // before pointing the iframe at a dev URL, or the user gets E2B's
    // "Sandbox Not Found" page inside the frame.
    const probe = request.nextUrl.searchParams.get('probe') === '1';
    // Check sandbox manager first, then fall back to global state
    const provider = sandboxManager.getActiveProvider() || global.activeSandboxProvider;
    const sandboxExists = !!provider;

    let sandboxHealthy = false;
    let sandboxInfo = null;

    if (sandboxExists && provider) {
      try {
        // Check if sandbox is healthy by getting its info
        const providerInfo = provider.getSandboxInfo();
        sandboxHealthy = !!providerInfo;

        if (sandboxHealthy && probe) {
          try {
            await provider.runCommand('true');
          } catch (probeError) {
            console.log('[sandbox-status] Liveness probe failed:', (probeError as Error).message);
            sandboxHealthy = false;
          }
        }
        
        sandboxInfo = {
          sandboxId: providerInfo?.sandboxId || global.sandboxData?.sandboxId,
          url: providerInfo?.url || global.sandboxData?.url,
          filesTracked: global.existingFiles ? Array.from(global.existingFiles) : [],
          lastHealthCheck: new Date().toISOString()
        };
      } catch (error) {
        console.error('[sandbox-status] Health check failed:', error);
        sandboxHealthy = false;
      }
    }
    
    return NextResponse.json({
      success: true,
      active: sandboxExists,
      healthy: sandboxHealthy,
      sandboxData: sandboxInfo,
      message: sandboxHealthy 
        ? 'Sandbox is active and healthy' 
        : sandboxExists 
          ? 'Sandbox exists but is not responding' 
          : 'No active sandbox'
    });
    
  } catch (error) {
    console.error('[sandbox-status] Error:', error);
    return NextResponse.json({ 
      success: false,
      active: false,
      error: (error as Error).message 
    }, { status: 500 });
  }
}
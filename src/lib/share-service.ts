import { supabase } from "@/integrations/supabase/client";

export type ShareType = 'leaderboard' | 'bracket' | 'history' | 'player';

interface CreateShareParams {
  gameId: string;
  shareType: ShareType;
  snapshotData: any;
}

export async function createShareableResult({
  gameId,
  shareType,
  snapshotData,
}: CreateShareParams) {
  try {
    // Generate a random 8-character token
    const shareToken = Math.random().toString(36).substring(2, 10);

    const { data, error } = await supabase
      .from('shared_results')
      .insert({
        game_id: gameId,
        share_token: shareToken,
        share_type: shareType,
        snapshot_data: snapshotData,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      shareToken,
      shareUrl: `${window.location.origin}/results/${shareToken}`,
      data,
    };
  } catch (error) {
    console.error('Error creating shareable result:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create share',
    };
  }
}

export async function getSharedResult(shareToken: string) {
  try {
    const { data, error } = await supabase
      .from('shared_results')
      .select('*')
      .eq('share_token', shareToken)
      .single();

    if (error) throw error;

    // Increment view count
    await supabase
      .from('shared_results')
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq('id', data.id);

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching shared result:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch share',
    };
  }
}

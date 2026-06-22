import { useToggleFeedHeart } from '../../queries/lounge-feed/useToggleFeedHeart';
import { useGetFeedComments } from '../../queries/lounge-feed/useGetFeedComments';
import { useCreateFeedComment } from '../../queries/lounge-feed/useCreateFeedComment';
import { useDeleteFeedComment } from '../../queries/lounge-feed/useDeleteFeedComment';
import type { FeedItem } from '../../types/db-compat';
import { FeedItemAnnouncement } from './FeedItemAnnouncement';
import { useState } from 'react';

interface Props {
  item: FeedItem;
  loungeId: string;
}

/**
 * 공지 카드 컨테이너 — 4종 mutation/query 호출 + 핸들러 생성 + presentational에 props 주입.
 * (UI/데이터 분리 1-F: 같은 폴더 다른 카드들이 이미 props 기반 presentational인 패턴에 정렬)
 *
 * `isCommentsOpen` UI state는 cardView 내부에 두는 게 자연이지만 useGetFeedComments
 * 의 enabled가 그 state에 의존하므로 컨테이너가 보유한다 (데이터 fetch 게이트).
 */
export function FeedItemAnnouncementContainer({ item, loungeId }: Props) {
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  const toggleHeart = useToggleFeedHeart();
  const commentsQuery = useGetFeedComments(item.type, item.id, isCommentsOpen);
  const createComment = useCreateFeedComment();
  const deleteComment = useDeleteFeedComment();

  return (
    <FeedItemAnnouncement
      item={item}
      comments={commentsQuery.data?.data ?? []}
      isCommentsOpen={isCommentsOpen}
      onToggleCommentsOpen={() => setIsCommentsOpen((v) => !v)}
      onToggleHeart={() => toggleHeart.mutate({ targetType: item.type, targetId: item.id, loungeId })}
      onCreateComment={(text) =>
        new Promise<void>((resolve, reject) => {
          createComment.mutate(
            { targetType: item.type, targetId: item.id, message: text, loungeId },
            { onSuccess: () => resolve(), onError: (err) => reject(err) },
          );
        })
      }
      onDeleteComment={(commentId) =>
        deleteComment.mutate({ commentId, targetType: item.type, targetId: item.id, loungeId })
      }
      isHeartPending={toggleHeart.isPending}
      isCommentMutating={createComment.isPending || deleteComment.isPending}
      isCommentsLoading={commentsQuery.isLoading}
    />
  );
}

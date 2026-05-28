import { useEffect, useRef } from 'react';
import type NavigatedViewerClass from 'bpmn-js/lib/NavigatedViewer';
import './bpmn-dark.css';

interface BpmnViewerProps {
  xml: string;
  activeActivityIds?: string[];
  completedActivityIds?: string[];
}

export function BpmnViewer({ xml, activeActivityIds = [], completedActivityIds = [] }: BpmnViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<NavigatedViewerClass | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!containerRef.current || isInitialized.current) return;

    let viewer: NavigatedViewerClass;

    const init = async () => {
      const { default: NavigatedViewer } = await import('bpmn-js/lib/NavigatedViewer');
      viewer = new NavigatedViewer({
        container: containerRef.current!,
      }) as NavigatedViewerClass;

      viewerRef.current = viewer;
      isInitialized.current = true;

      await viewer.importXML(xml);
      applyTokenOverlay(viewer, activeActivityIds, completedActivityIds);
    };

    void init();

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
        isInitialized.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cập nhật overlay khi trạng thái thay đổi
  useEffect(() => {
    if (!viewerRef.current) return;
    applyTokenOverlay(viewerRef.current, activeActivityIds, completedActivityIds);
  }, [activeActivityIds, completedActivityIds]);

  // Re-import XML khi thay đổi
  useEffect(() => {
    if (!viewerRef.current || !xml) return;
    viewerRef.current.importXML(xml).then(() => {
      if (viewerRef.current) {
        applyTokenOverlay(viewerRef.current, activeActivityIds, completedActivityIds);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xml]);

  return (
    <div
      ref={containerRef}
      className="bpmn-dark"
      style={{
        width: '100%',
        height: '500px',
        borderRadius: 6,
        background: '#1e293b',
        overflow: 'hidden',
      }}
    />
  );
}

function applyTokenOverlay(
  viewer: NavigatedViewerClass,
  activeIds: string[],
  completedIds: string[],
) {
  try {
    const overlays = viewer.get('overlays') as {
      clear: (arg: string) => void;
      add: (id: string, type: string, config: object) => void;
    };

    overlays.clear('token-overlay');

    for (const id of completedIds) {
      overlays.add(id, 'token-overlay', {
        position: { top: -12, right: -12 },
        html: '<div style="background:#52c41a;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold;">✓</div>',
      });
    }

    for (const id of activeIds) {
      overlays.add(id, 'token-overlay', {
        position: { top: -12, right: -12 },
        html: '<div style="background:#1677ff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;animation:pulse 1.5s infinite;">●</div>',
      });
    }
  } catch {
    // Viewer chưa sẵn sàng
  }
}

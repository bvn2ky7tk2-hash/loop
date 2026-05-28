import { useEffect, useRef, useCallback } from 'react';
import type BpmnModelerClass from 'bpmn-js/lib/Modeler';
import { theme as antTheme } from 'antd';
import { useThemeStore } from '../../../store/theme.store';
import './bpmn-dark.css';

const { useToken } = antTheme;

interface BpmnModelerProps {
  xml?: string;
  onChange?: (xml: string) => void;
  onReady?: (modeler: BpmnModelerClass) => void;
}

const DEFAULT_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  id="Definitions_1"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="Bắt đầu" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="82" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

export function BpmnModeler({ xml, onChange, onReady }: BpmnModelerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<BpmnModelerClass | null>(null);
  const isInitialized = useRef(false);
  const isDark = useThemeStore((s) => s.mode === 'dark');
  const { token } = useToken();

  const handleChange = useCallback(() => {
    if (!modelerRef.current || !onChange) return;
    modelerRef.current
      .saveXML({ format: true })
      .then(({ xml: savedXml }) => {
        if (savedXml) onChange(savedXml);
      })
      .catch(() => {});
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current || isInitialized.current) return;

    let modeler: BpmnModelerClass;

    const init = async () => {
      const { default: Modeler } = await import('bpmn-js/lib/Modeler');
      modeler = new Modeler({
        container: containerRef.current!,
        keyboard: { bindTo: document },
      }) as BpmnModelerClass;

      modelerRef.current = modeler;
      isInitialized.current = true;

      const xmlToLoad = xml || DEFAULT_BPMN;
      await modeler.importXML(xmlToLoad);

      const canvas = modeler.get('canvas') as { zoom: (type: string) => void };
      canvas.zoom('fit-viewport');

      const eventBus = modeler.get('eventBus') as { on: (event: string, fn: () => void) => void };
      eventBus.on('commandStack.changed', handleChange);

      if (onReady) onReady(modeler);
    };

    void init();

    return () => {
      if (modelerRef.current) {
        modelerRef.current.destroy();
        modelerRef.current = null;
        isInitialized.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!modelerRef.current || !xml) return;
    modelerRef.current.importXML(xml).then(() => {
      const canvas = modelerRef.current?.get('canvas') as { zoom: (type: string) => void } | undefined;
      canvas?.zoom('fit-viewport');
    }).catch(() => {});
  }, [xml]);

  return (
    <div
      ref={containerRef}
      className={isDark ? 'bpmn-dark' : undefined}
      style={{
        width: '100%',
        height: 'calc(100vh - 160px)',
        minHeight: 500,
        borderRadius: 6,
        overflow: 'hidden',
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
      }}
    />
  );
}

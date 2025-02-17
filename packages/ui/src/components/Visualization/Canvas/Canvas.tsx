import { Icon } from '@patternfly/react-core';
import { CatalogIcon } from '@patternfly/react-icons';
import {
  GRAPH_LAYOUT_END_EVENT,
  Model,
  SELECTION_EVENT,
  TopologyControlBar,
  TopologyView,
  VisualizationProvider,
  VisualizationSurface,
  action,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
} from '@patternfly/react-topology';
import {
  FunctionComponent,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import layoutHorizontalIcon from '../../../assets/layout-horizontal.png';
import layoutVerticalIcon from '../../../assets/layout-vertical.png';
import { useLocalStorage } from '../../../hooks';
import { LocalStorageKeys } from '../../../models';
import { BaseVisualCamelEntity } from '../../../models/visualization/base-visual-entity';
import { CatalogModalContext } from '../../../providers/catalog-modal.provider';
import { VisibleFlowsContext } from '../../../providers/visible-flows.provider';
import { VisualizationEmptyState } from '../EmptyState';
import { CanvasSideBar } from './CanvasSideBar';
import { CanvasDefaults } from './canvas.defaults';
import { CanvasEdge, CanvasNode, LayoutType } from './canvas.models';
import { CanvasService } from './canvas.service';

interface CanvasProps {
  contextToolbar?: ReactNode;
  entities: BaseVisualCamelEntity[];
}

export const Canvas: FunctionComponent<PropsWithChildren<CanvasProps>> = (props) => {
  /** State for @patternfly/react-topology */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<CanvasNode | undefined>(undefined);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [activeLayout, setActiveLayout] = useLocalStorage(LocalStorageKeys.CanvasLayout, CanvasDefaults.DEFAULT_LAYOUT);

  /** Context to interact with the Canvas catalog */
  const catalogModalContext = useContext(CatalogModalContext);

  const controller = useMemo(() => CanvasService.createController(), []);
  const { visibleFlows } = useContext(VisibleFlowsContext)!;
  const shouldShowEmptyState = useMemo(() => {
    const areNoFlows = props.entities.length === 0;
    const areAllFlowsHidden = Object.values(visibleFlows).every((visible) => !visible);
    return areNoFlows || areAllFlowsHidden;
  }, [props.entities.length, visibleFlows]);

  const controlButtons = useMemo(() => {
    const customButtons = catalogModalContext
      ? [
          {
            id: 'topology-control-bar-h_layout-button',
            icon: (
              <Icon>
                <img src={layoutHorizontalIcon} />
              </Icon>
            ),
            tooltip: 'Horizontal Layout',
            callback: action(() => {
              setActiveLayout(LayoutType.DagreHorizontal);
              controller.getGraph().setLayout(LayoutType.DagreHorizontal);
              controller.getGraph().reset();
              controller.getGraph().layout();
            }),
          },
          {
            id: 'topology-control-bar-v_layout-button',
            icon: (
              <Icon>
                <img src={layoutVerticalIcon} />
              </Icon>
            ),
            tooltip: 'Vertical Layout',
            callback: action(() => {
              setActiveLayout(LayoutType.DagreVertical);
              controller.getGraph().setLayout(LayoutType.DagreVertical);
              controller.getGraph().reset();
              controller.getGraph().layout();
            }),
          },
          {
            id: 'topology-control-bar-catalog-button',
            icon: <CatalogIcon />,
            tooltip: 'Open Catalog',
            callback: () => {
              catalogModalContext.setIsModalOpen(true);
            },
          },
        ]
      : [];

    return createTopologyControlButtons({
      ...defaultControlButtonsOptions,
      zoomInCallback: action(() => {
        controller.getGraph().scaleBy(4 / 3);
      }),
      zoomOutCallback: action(() => {
        controller.getGraph().scaleBy(3 / 4);
      }),
      fitToScreenCallback: action(() => {
        controller.getGraph().fit(80);
      }),
      resetViewCallback: action(() => {
        controller.getGraph().reset();
        controller.getGraph().layout();
      }),
      legend: false,
      customButtons,
    });
  }, [catalogModalContext, controller]);

  const handleSelection = useCallback(
    (selectedIds: string[]) => {
      setSelectedIds(selectedIds);

      /** Current support for single selection at the moment */
      const selectedId = selectedIds[0];
      setSelectedNode(nodes.find((node) => node.id === selectedId));
    },
    [nodes],
  );

  /** Set up the controller one time */
  useEffect(() => {
    const localController = controller;
    const graphLayoutEndFn = () => {
      localController.getGraph().fit(80);
    };

    localController.addEventListener(SELECTION_EVENT, handleSelection);
    localController.addEventListener(GRAPH_LAYOUT_END_EVENT, graphLayoutEndFn);

    return () => {
      localController.removeEventListener(SELECTION_EVENT, handleSelection);
      localController.removeEventListener(GRAPH_LAYOUT_END_EVENT, graphLayoutEndFn);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSelection]);

  /** Draw graph */
  useEffect(() => {
    if (!Array.isArray(props.entities)) return;
    setSelectedNode(undefined);

    const nodes: CanvasNode[] = [];
    const edges: CanvasEdge[] = [];

    props.entities.forEach((entity) => {
      if (visibleFlows[entity.id]) {
        const { nodes: childNodes, edges: childEdges } = CanvasService.getFlowDiagram(entity.toVizNode());
        nodes.push(...childNodes);
        edges.push(...childEdges);
      }
    });

    setNodes([...nodes]);

    const model: Model = {
      nodes,
      edges,
      graph: {
        id: 'g1',
        type: 'graph',
        layout: activeLayout,
      },
    };

    controller.fromModel(model, false);
  }, [controller, props.entities, visibleFlows]);

  const handleCloseSideBar = useCallback(() => {
    setSelectedIds([]);
    setSelectedNode(undefined);
  }, []);

  return (
    <TopologyView
      sideBar={<CanvasSideBar selectedNode={selectedNode} onClose={handleCloseSideBar} />}
      contextToolbar={props.contextToolbar}
      controlBar={<TopologyControlBar controlButtons={controlButtons} />}
    >
      <VisualizationProvider controller={controller}>
        {shouldShowEmptyState ? (
          <VisualizationEmptyState data-testid="visualization-empty-state" entitiesNumber={props.entities.length} />
        ) : (
          <VisualizationSurface state={{ selectedIds }} />
        )}
      </VisualizationProvider>
    </TopologyView>
  );
};

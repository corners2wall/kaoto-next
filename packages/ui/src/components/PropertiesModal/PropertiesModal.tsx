import { Modal } from '@patternfly/react-core';
import { Caption, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { FunctionComponent } from 'react';
import { camelComponentToTable, kameletToTable } from '../../camel-utils/camel-to-table.adapter';
import { CatalogKind, ICamelComponentDefinition, ICamelProcessorDefinition, IKameletDefinition } from '../../models';
import { ITile } from '../Catalog';
import { EmptyTableState } from './EmptyTableState';
import { IPropertiesTable } from './PropertiesModal.models';
import './PropertiesModal.scss';

interface IPropertiesModalProps {
  tile: ITile;
  onClose: () => void;
  isModalOpen: boolean;
}

export const PropertiesModal: FunctionComponent<IPropertiesModalProps> = (props) => {
  let table: IPropertiesTable;
  switch (props.tile.type) {
    case CatalogKind.Component:
      table = camelComponentToTable(props.tile.rawObject as ICamelComponentDefinition);
      break;
    case CatalogKind.Processor:
      table = camelComponentToTable(props.tile.rawObject as ICamelProcessorDefinition);
      break;
    case CatalogKind.Kamelet:
      table = kameletToTable(props.tile.rawObject as IKameletDefinition);
      break;
    default:
      throw Error('Unknown CatalogKind during rendering modal: ' + props.tile?.type);
  }

  return (
    <Modal
      className="properties-modal"
      title={props.tile.title}
      isOpen={props.isModalOpen}
      onClose={props.onClose}
      ouiaId="BasicModal"
    >
      <p data-testid="properties-modal-table-description">{props.tile.description}</p>
      <Table aria-label="Simple table" variant="compact">
        <Caption data-testid="properties-modal-table-caption">
          {'Available properties (' + table.rows.length + ')'}
        </Caption>
        <Thead>
          <Tr>
            {table.headers.map((header) => (
              <Th data-testid={'header-' + header} key={header}>
                {header}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {table.rows.length != 0 &&
            table.rows.map((row, index) => (
              <Tr data-testid={'row-' + index} key={index}>
                {table.headers.map((header) => (
                  <Td data-testid={'row-' + index + '-cell-' + header} key={index + header} dataLabel={header}>
                    {row[header]?.toString()}
                  </Td>
                ))}
              </Tr>
            ))}
          {table.rows.length == 0 && <EmptyTableState componentName={props.tile.name}></EmptyTableState>}
        </Tbody>
      </Table>
    </Modal>
  );
};
import './css/CategoryWindow.css';
import { classNames, PropTypes, Window, Content, Buttons, Form, FormControl, Label, Input, Select, ImageUploader, Button, DataGrid, Columns, Column, VBoxLayout, Toolbar } from '../../../third_party';
import Ajax from '../../../utils/Ajax';
import CategoryEditWindow from './CategoryEditWindow.jsx';

/**
 * 类别窗口
 * @author tengge / https://github.com/tengge1
 */
class CategoryWindow extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            data: [],
            selected: null,
        };

        this.updateUI = this.updateUI.bind(this);
        this.handleAdd = this.handleAdd.bind(this);
        this.handleEdit = this.handleEdit.bind(this);
        this.handleDelete = this.handleDelete.bind(this);
        this.handleSelect = this.handleSelect.bind(this);
        this.handleClose = this.handleClose.bind(this);
    }

    render() {
        const { type, typeName } = this.props;
        const { data, selected } = this.state;

        return <Window
            className={'CategoryWindow'}
            title={`${typeName} ${_t('Category Edit')}`}
            style={{ width: '280px', height: '400px', }}
            mask={false}
            onClose={this.handleClose}>
            <Content>
                <VBoxLayout className={'box'}>
                    <Toolbar className={'toolbar'}>
                        <Button onClick={this.handleAdd}>{_t('Create')}</Button>
                        <Button onClick={this.handleEdit}>{_t('Edit')}</Button>
                        <Button onClick={this.handleDelete}>{_t('Delete')}</Button>
                    </Toolbar>
                    <DataGrid className={'list'} data={data} selected={selected} onSelect={this.handleSelect}>
                        <Columns>
                            <Column type={'number'} title={_t('#')}></Column>
                            <Column field={'Name'} title={_t('Name')}></Column>
                        </Columns>
                    </DataGrid>
                </VBoxLayout>
            </Content>
            <Buttons>
                <Button onClick={this.handleClose}>{_t('Close')}</Button>
            </Buttons>
        </Window>;
    }

    componentDidMount() {
        this.updateUI();
    }

    updateUI() {
        Ajax.getJson(`${app.options.server}/api/Category/List?Type=${this.props.type}`, json => {
            this.setState({
                data: json.Data.map(n => {
                    return {
                        id: n.ID,
                        ID: n.ID,
                        Name: n.Name,
                    };
                }),
            });
        });
    }

    handleAdd() {
        const { type, typeName } = this.props;

        let window = app.createElement(CategoryEditWindow, {
            type,
            typeName,
            id: null,
            name: '',
            callback: this.updateUI,
        });

        app.addElement(window);
    }

    handleEdit() {

    }

    handleDelete() {

    }

    handleSelect(obj) {
        this.setState({
            selected: obj.id,
        });
    }

    handleClose() {
        app.removeElement(this);
    }
}

CategoryWindow.propTypes = {
    type: PropTypes.oneOf(['Scene', 'Mesh', 'Map', 'Texture', 'Material', 'Audio', 'Particle']),
    typeName: PropTypes.string,
    callback: PropTypes.func,
};

CategoryWindow.defaultProps = {
    type: 'Scene',
    typeName: 'Scene',
    callback: null,
};

export default CategoryWindow;
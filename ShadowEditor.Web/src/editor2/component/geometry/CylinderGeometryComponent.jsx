import { PropertyGrid, PropertyGroup, TextProperty, DisplayProperty, CheckBoxProperty, NumberProperty, IntegerProperty } from '../../../third_party';
import SetGeometryCommand from '../../../command/SetGeometryCommand';

/**
 * 圆柱组件
 * @author tengge / https://github.com/tengge1
 */
class CylinderGeometryComponent extends React.Component {
    constructor(props) {
        super(props);

        this.selected = null;

        this.state = {
            show: false,
            expanded: true,
            radiusTop: 1.0,
            radiusBottom: 1.0,
            height: 1.0,
            radialSegments: 16,
            heightSegments: 1,
            openEnded: false,
        };

        this.handleExpand = this.handleExpand.bind(this);
        this.handleUpdate = this.handleUpdate.bind(this);
        this.handleChange = this.handleChange.bind(this);
    }

    render() {
        const { show, expanded, radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded } = this.state;

        if (!show) {
            return null;
        }

        return <PropertyGroup title={L_GEOMETRY_COMPONENT} show={show} expanded={expanded} onExpand={this.handleExpand}>
            <NumberProperty name={'radiusTop'} label={L_RADIUS_TOP} value={radiusTop} onChange={this.handleChange}></NumberProperty>
            <NumberProperty name={'radiusBottom'} label={L_RADIUS_BOTTOM} value={radiusBottom} onChange={this.handleChange}></NumberProperty>
            <NumberProperty name={'height'} label={L_HEIGHT} value={height} onChange={this.handleChange}></NumberProperty>
            <IntegerProperty name={'radialSegments'} label={L_RADIAL_SEGMENTS} value={radialSegments} onChange={this.handleChange}></IntegerProperty>
            <IntegerProperty name={'heightSegments'} label={L_HEIGHT_SEGMENTS} value={heightSegments} onChange={this.handleChange}></IntegerProperty>
            <CheckBoxProperty name={'openEnded'} label={L_OPEN_ENDED} value={openEnded} onChange={this.handleChange}></CheckBoxProperty>
        </PropertyGroup>;
    }

    componentDidMount() {
        app.on(`objectSelected.CylinderGeometryComponent`, this.handleUpdate);
        app.on(`objectChanged.CylinderGeometryComponent`, this.handleUpdate);
    }

    handleExpand(expanded) {
        this.setState({
            expanded,
        });
    }

    handleUpdate() {
        const editor = app.editor;

        if (!editor.selected || !(editor.selected instanceof THREE.Mesh) || !(editor.selected.geometry instanceof THREE.CylinderBufferGeometry)) {
            this.setState({
                show: false,
            });
            return;
        }

        this.selected = editor.selected;

        const state = Object.assign({}, this.selected.geometry.parameters, {
            show: true,
        });

        this.setState(state);
    }

    handleChange(value, name, event) {
        const state = Object.assign({}, this.state, {
            [name]: value,
        });

        this.setState(state);

        app.editor.execute(new SetGeometryCommand(this.selected, new THREE.CylinderBufferGeometry(
            state.radiusTop,
            state.radiusBottom,
            state.height,
            state.radialSegments,
            state.heightSegments,
            state.openEnded,
        )));
    }
}

export default CylinderGeometryComponent;
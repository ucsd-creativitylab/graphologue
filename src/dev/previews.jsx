import React from 'react';
import {ComponentPreview, Previews} from '@react-buddy/ide-toolbox';
import {PaletteTree} from './palette';
import CustomEdge from "../CustomEdge";

const ComponentPreviews = () => {
    return (
        <Previews palette={<PaletteTree/>}>
            <ComponentPreview path="/CustomEdge">
                <CustomEdge/>
            </ComponentPreview>
        </Previews>
    );
};

export default ComponentPreviews;
import * as React from 'react';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CustomEdge from '../CustomEdge';
import PropTypes from 'prop-types';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import {useState} from "react";



const MediaCard = (props) => {

    return (
        <Card sx={{ maxWidth: 345 }}>
            <CardMedia
                image="/static/images/cards/contemplative-reptile.jpg"
                title="green iguana"
            />
            <CardContent>
                    <Typography gutterBottom variant="h7" component="div">
                        How {props.source_label} {props.relationship_label} {props.target_label}?
                    </Typography>
                    <Paper style={{maxHeight: 200, overflow: 'auto'}}>
                        <Typography variant="body2" color="text.secondary">
                            <Grid container>
                                {props.response}
                            </Grid>
                        </Typography>
                    </Paper>


            </CardContent>
            <CardActions>
                <Button size="small">Close</Button>
                <Button size="small">Learn More</Button>
            </CardActions>
        </Card>
    );
}

 MediaCard.propTypes = {
    response: PropTypes.string,
    node_1_label: PropTypes.string,
    node_2_label: PropTypes.string,
  };

export default MediaCard;
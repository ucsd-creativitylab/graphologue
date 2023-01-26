import React, {useCallback, useContext, useState, useStore, useEffect} from 'react';
import {getBezierPath, useReactFlow} from 'reactflow';
import './index.css';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import {EdgeContext} from "./EdgeContext";
import CategoryIcon from '@mui/icons-material/Category';
import {Alert, CardActionArea, Collapse, IconButton} from "@mui/material";
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardMedia from "@mui/material/CardMedia";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Draggable from "react-draggable";
import SchoolIcon from '@mui/icons-material/School';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import ImageIcon from '@mui/icons-material/Image';
import WorkIcon from '@mui/icons-material/Work';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import YouTubeIcon from '@mui/icons-material/YouTube';

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  //   apiKey: process.env.OPENAI_API_KEY,
  apiKey: "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"
});
const openai = new OpenAIApi(configuration);
export default function CustomEdge({
  id,
  sourceX,
  sourceY, targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });


  const NodeSetter = (state) => state.setNodes;

  function AddNode() {
    const setNodes = useStore(NodeSetter);

    useEffect(() => {
      NodeSetter();
    }, []);

    return null;
  }

  const identifier = id;
  const [query, setQuery] = useState('');
  const [helpQuery, setHelpQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isOpen, searchOpen] = useState(false)
  const [isHelpMode, helpMode] = useState(false)
  const [isToolOpen, toolsOpen] = useState(false)
  const [isExplainOpen, setOpen] = useState(false)
  const edges = useContext(EdgeContext);
  const nodes = useContext(EdgeContext);
  const setNodes = useContext(EdgeContext);
  const explainVisible = useContext(EdgeContext);
  const setVisible = useContext(EdgeContext);
  const [isLoading, setIsLoading] = useState(false);
  const [reveal, setReveal] = React.useState(false);

  const handleReveal = () => {
    setReveal((reveal) => !reveal);
  };

/*  nodes['nodes'][9] = {
    id: '1',
    type: 'input',
    data: {label: 'Test Node'},
    position: {x: 120, y: 300},
  };*/


  var index = edges['edges'].findIndex(p => p.id == identifier);
  var source = edges['edges'][index]['source']
  var target = edges['edges'][index]['target']
  var source_index = nodes['nodes'].findIndex(q => q.id == source)
  var target_index = nodes['nodes'].findIndex(r => r.id == target)
  var source_label = nodes['nodes'][source_index]['data']['label']
  var target_label = nodes['nodes'][target_index]['data']['label']
  var relationship_label = edges['edges'][index]['data']['text']

  const { project } = useReactFlow();

  let new_edge_id = ""

  new_edge_id = "node" + (edges.length+1).toString();



  const handleChange = (e) => {
    setQuery(e.target.value);
  }

  const handleHelp = async (e) => {
      setIsLoading(true);
      setOpen(true);
      e.preventDefault();
      setOpen(true)
      const response = await openai.createCompletion({
        model: "text-davinci-003",
        //prompt: "Relationship between"+sourceX+"and"+labelY,
        prompt: "Explain how" + source_label + relationship_label + target_label,
        temperature: 0.7,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });
      console.log("action_done")
      setIsLoading(false);
      console.log(response['data']['choices'][0]['text']);
      setResponse(response['data']['choices'][0]['text']);
    //const apiResponse = response['data']['choices'][0]['text'];
  }

  const handleSubmit = async (e) => {
    //setIsLoading(true);
    setOpen(true);
    e.preventDefault();
    setOpen(true)
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      //prompt: "Relationship between"+sourceX+"and"+labelY,
      prompt: query,
      temperature: 0.7,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });
    console.log(response['data']['choices'][0]['text']);
    setResponse(response['data']['choices'][0]['text']);
    //setIsLoading(false);
    //const apiResponse = response['data']['choices'][0]['text'];
  }

  const addNode = useCallback(() => {
    console.log(explainVisible)
    setNodes((nodes) => {
      //console.log(nodes);
      return [
        ...nodes,
        {
          id: Math.random(),
          position: { x: labelX-50, y: labelY-50 },
          data: { label: "yo" }
        }
      ];
    });
  }, []);

  const explainerContent =
    <>
      <Draggable>
      <foreignObject
        width={400}
        height={1000}
        x={700} y={0}>
        <Card variant="outlined">
          <CardContent>
            <Typography gutterBottom variant="h6" component="div">
              How {source_label} {relationship_label} {target_label}?
            </Typography>
            <Paper square={false} variant="outlined" class="ml-auto" style={ {overflow: 'auto'}}>
              <Typography variant="body2"  color="text.secondary">
                <Grid container class="ml-auto">
                  {response}
                </Grid>
              </Typography>
            </Paper>
            <div class="mt-2">
            <Alert severity="warning">Generated by GPT-3
            <a href="https://help.openai.com/en/articles/6827058-why-doesn-t-chatgpt-know-about-x" target="_blank"> Why should I verify? </a>
            </Alert>
            </div>
          </CardContent>
          <Grid container>
          <CardActions variant="outlined">
            <Button variant="outlined" style={{backgroundColor: "#FFCCCB"}} onClick={() => setOpen(!isExplainOpen)} size="small" >Close</Button>
            <Button size="small" variant="outlined" onClick={() => setReveal(!reveal)}>Show sources</Button>
            <Button size="small" variant="outlined" onClick={() => setReveal(!reveal)}>Google Scholar <SchoolIcon/></Button>
          </CardActions>
            </Grid>
        </Card>
        <div class="mt-3">
        <Collapse in={reveal}>
          <Card>
            <CardActionArea>
              <CardContent>
                <Typography gutterBottom variant="overline" component="div">
                  Some helpful links
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This tool is only meant to assist your knowledge exploration. Please verify your sources.
                  <List sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          <NewspaperIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <a href="https://sciencing.com/salt-kills-leeches-10042678.html">
                      <ListItemText primary="News" secondary="Why Salt Kills Leeches (Source: Sciencing)" />
                      </a>
                    </ListItem>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          <YouTubeIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <a href="https://sciencing.com/salt-kills-leeches-10042678.html">
                      <ListItemText primary="Youtube" secondary="Effects of Salt on Leech" />
                      </a>
                    </ListItem>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          <SchoolIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary="Research Article" secondary="Effect of salinity and temperature on marine leech, Zeylanicobdella arugamensis (De Silva) under laboratory conditions" />
                    </ListItem>
                  </List>
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Collapse>
        </div>
      </foreignObject>
      </Draggable>
    </>

  const searchBox =
      <>
        <foreignObject width="100%"
                       height="100%"
                       x={labelX + 100}//foreignObjectSize / 2}
                       y={labelY - 30}>
          <Grid container spacing={2}>
            <Grid item>
              <TextField onSubmit={handleSubmit} value={query} onChange={handleChange} multiline id="outlined-basic" label="Explore Something New" variant="outlined" />
            </Grid>
            <Grid item>
              <Button variant="contained" onClick={handleSubmit}>Explore</Button>
            </Grid>
          </Grid>
        </foreignObject>
      </>
  return (
      <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      <foreignObject
          width={60}
          height={40}
          x={labelX - 30}//foreignObjectSize / 2}
          y={labelY + 30}
          className="edgebutton-foreignobject"
          requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <IconButton style={{maxWidth: '60px', maxHeight: '30px', minWidth: '30px', minHeight: '30px'}} variant="contained" onClick={() => toolsOpen(!isToolOpen)}>
          <CategoryIcon/></IconButton>
      </foreignObject>
      { isToolOpen && <>
        <foreignObject
            width={100}
            height={40}
            x={labelX - 10}//foreignObjectSize / 2}
            y={labelY + 70}
            className="edgebutton-foreignobject"
            requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <Button style={{maxWidth: '70px', maxHeight: '30px', minWidth: '30px', minHeight: '30px'}} variant="outlined" onClick={handleHelp}>Explain</Button>
        </foreignObject>
        <foreignObject
        width={100}
        height={40}
        x={labelX - 10}//foreignObjectSize / 2}
        y={labelY + 110}
        className="edgebutton-foreignobject"
        requiredExtensions="http://www.w3.org/1999/xhtml"
        >
        <Button style={{maxWidth: '70px', maxHeight: '30px', minWidth: '30px', minHeight: '30px'}} variant="outlined" onClick={() => searchOpen(!isOpen)}>Explore</Button>
        </foreignObject>
        <foreignObject
            width={100}
            height={40}
            x={labelX - 10}//foreignObjectSize / 2}
            y={labelY + 150}
            className="edgebutton-foreignobject"
            requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <Button disabled={true} style={{maxWidth: '70px', maxHeight: '30px', minWidth: '30px', minHeight: '30px'}} variant="outlined" onClick={addNode}>Node</Button>
        </foreignObject>
        </>
      }
      { isExplainOpen ? explainerContent:null}
      { isOpen && searchBox}
      <text>
        <textPath href={`#${id}`} style={{ fontSize: 12 }} startOffset="50%" textAnchor="middle">
          {data.text}
        </textPath>
      </text>
    </>
  );
}

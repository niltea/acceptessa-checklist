import React from 'react';
import FontAwesome from 'react-fontawesome';
import _ from 'lodash';
import { withRouter } from 'react-router-dom';
import { ButtonToolbar, DropdownButton, MenuItem, Alert, Well, Badge, Tab, Nav, NavItem, Button, Glyphicon } from 'react-bootstrap';

import CircleDescriptionModal from './component/CircleDescriptionModal';
import FavoriteListPane from './component/FavoriteListPane';
import CircleListPane from './component/CircleListPane';
import CirclecutPane from './component/CirclecutPane';
import MapPane from './component/MapPane';

class AdminRoot extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
        circleList:  [],
        circleIdx:   {},
        favoriteIdx: {},
        sort_order:  [],
        loading:     {},
        map: null,
        modalShow: false,
        selectedCircle: null,
        me: null,
    };

    this.AUTH_ENDPOINT      = "https://v7hwasc1o7.execute-api.ap-northeast-1.amazonaws.com/dev";
    this.CHECKLIST_ENDPOINT = "https://orc4t3x8hh.execute-api.ap-northeast-1.amazonaws.com/dev/endpoint";

    this.openModal              = this.openModal.bind(this);
    this.closeModal             = this.closeModal.bind(this);
    this.addFavorite            = this.addFavorite.bind(this);
    this.removeFavorite         = this.removeFavorite.bind(this);
    this.updateFavoriteComment  = this.updateFavoriteComment.bind(this);
    this.loginPopup             = this.loginPopup.bind(this);
    this.logout                 = this.logout.bind(this);
    this.addLoading             = this.addLoading.bind(this);
    this.removeLoading          = this.removeLoading.bind(this);
  }

  callApi(args) {
    const token = localStorage.getItem("token");
    if (token) {
      return fetch(this.CHECKLIST_ENDPOINT, {
        headers: new Headers({ 'Authorization': "Bearer " + token }),
        method: 'POST',
        body: JSON.stringify(args),
        cors: true,
      }).then(data => data.json());
    } else {
      return Promise.reject("no access token!!");
    }
  }

  addLoading(key) {
    const { loading } = this.state;
    loading[key] = 1;
    this.setState({ loading });
  }

  removeLoading(key) {
    const { loading } = this.state;
    delete loading[key];
    this.setState({ loading });
  }

  componentDidMount() {
    this.loadLoginInfo();

    this.addLoading("circle");
    this.addLoading("favorite");
    this.addLoading("map");


    this.callApi({ command: "list", exhibition_id: "aqmd3rd", member_id: "mimin_ga_mi_bot" })
      .then(data => {
        this.removeLoading("favorite");

        console.log("FAVORITE_DATA_OK:", data.length)
        const favoriteIdx = {};
        for (const f of data) {
          favoriteIdx[f.circle_id] = f;
        }
        this.setState({ favoriteIdx });
      })
      .catch(err => console.log);

    fetch(window.location.origin + '/aqmd3rd.json', { credentials: 'include' })
      .then(data => data.json())
      .then(data => {
        this.removeLoading("circle");
        this.setState({ circleList: data.circles, sort_order: data.sort_order });
        this.componentWillReceiveProps(this.props);
      })
      .catch(err => console.log);

    fetch(window.location.origin + '/map.json', { credentials: 'include' })
      .then(data => data.json())
      .then(data => {
        this.removeLoading("map");
        const maps = [];

        for (const sym of Object.keys(data.positions)) {
          const positions = data.positions[sym];

          for (const pos of positions)  {
            for (const i of _.range(pos.start, pos.end + 1) ) {
              maps.push({
                sym: sym,
                num: i,
                top: (pos.y + (i - ( pos.start - 1 ) -1) * 18 ) + "px",
                left: pos.x + "px",
              });
            }
          }
        }

        this.setState({ map: maps });
      })
      .catch(err => console.log);
  }

  loadLoginInfo() {
    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    const headers = new Headers();
    headers.append('Authorization', "Bearer " + token);

    fetch(this.AUTH_ENDPOINT + "/me", { headers: headers, mode: "cors" })
      .then(data => data.json())
      .then(data => {
        console.log("LOGIN_DATA_OK:", data);
        this.setState({ me: data });
      })
      .catch(err => {
        console.log("LOGIN_DATA_NG:", err);
        this.setState({ me: null });
      })
  }

  logout() {
    localStorage.clear();
    this.setState({ me: null });
  }

  openModal(selectedCircle) {
    const param = new URLSearchParams();
    param.append("circle_id", selectedCircle.circle_id);
    this.props.history.push("?" + param.toString());
  }

  closeModal() {
    this.props.history.push("?");
  }

  addFavorite(circle) {
    const { favoriteIdx } = this.state;

    this.addLoading(circle.circle_id);
    this.callApi({ command: "add", exhibition_id: "aqmd3rd", circle_id: circle.circle_id })
      .then(data => {
        this.removeLoading(circle.circle_id);

        if(data.error) {
          alert(data.error + ": エラーが発生しました。しばらく経ってもエラーが続く場合は管理者に問い合わせてください。");
        } else {
          console.log("ADD_FAVORITE", data);
          favoriteIdx[circle.circle_id] = data;
          this.setState({ favoriteIdx });
        }
      })
      .catch(err => console.log);
  }

  removeFavorite(circle) {
    const { favoriteIdx } = this.state;

    this.addLoading(circle.circle_id);
    this.callApi({ command: "remove", circle_id: circle.circle_id })
      .then(data => {
        this.removeLoading(circle.circle_id);
        console.log("REMOVE_FAVORITE", data);
        delete favoriteIdx[circle.circle_id];
        this.setState({ favoriteIdx });
      })
      .catch(err => console.log);
  }

  updateFavoriteComment(circle,comment) {
    const { favoriteIdx } = this.state;

    this.addLoading(circle.circle_id);
    this.callApi({ command: "update", circle_id: circle.circle_id, comment: comment })
      .then(data => {
        this.removeLoading(circle.circle_id);
        console.log("UPDATE_FAVORITE", data);
        const fav = favoriteIdx[circle.circle_id];
        fav.comment = comment;
        this.setState({ favoriteIdx });
      })
      .catch(err => console.log);
  }

  loginPopup() {
    const getJwtToken = event => {
      localStorage.setItem("token", event.data);
      this.loadLoginInfo();
    };

    window.open(this.BASE_URL + "/auth");
    window.addEventListener('message', getJwtToken, false);
  }

  componentWillReceiveProps(props){
    const param = new URLSearchParams(props.location.search);
    const circle_id = param.get("circle_id");
    const circle = this.state.circleList.filter(c => c.circle_id === circle_id)[0]

    if (circle) {
      this.setState({ selectedCircle: circle, modalShow: true });
    } else {
      this.setState({ modalShow: false });
    }
  }

  render() {
    const { circleList, favoriteIdx, loading, map, modalShow, selectedCircle, me } = this.state;

    return <div className="container">
      <br/>
      <Well bsSize="small" className="clearfix">
        <span>サークル一覧 (アクアマリンドリーム)  <Badge>{circleList.length}</Badge></span>
        <div className="pull-right">
          {
            me
              ? <ButtonToolbar>
                  <DropdownButton
                    bsStyle="success"
                    bsSize="xsmall"
                    id="dropdown-size-extra-small"
                    title={<span><FontAwesome name="twitter"/> {me.screen_name}</span>}>
                      <MenuItem eventKey="1"><Glyphicon glyph="export"/> エクスポート</MenuItem>
                      <MenuItem divider />
                      <MenuItem eventKey="4" onClick={this.logout}><FontAwesome name="sign-out"/> ログアウト</MenuItem>
                  </DropdownButton>
                </ButtonToolbar>
              : <Button bsStyle="primary" bsSize="xs" onClick={this.loginPopup}>
                  <FontAwesome name="twitter"/> Login via Twitter
                </Button>
          }
        </div>
      </Well>
      {
        !me &&
          <Alert>
            <Glyphicon glyph="exclamation-sign"/> ログインを行うことでチェックリストの作成を行うことができます。
          </Alert>
      }
      {
        JSON.stringify(this.state.loading)
      }
      {/*
        this.state.loading &&
          <div className="text-center text-muted">
            <FontAwesome name="spinner" size="5x" spin pulse={true} /><h3>Loading...</h3>
          </div>
      */}
      <Tab.Container id="left-tabs-example" defaultActiveKey="list">
        <div>
          <Nav bsStyle="pills">
            <NavItem eventKey="list"><Glyphicon glyph="th-list"/> リスト表示</NavItem>
            <NavItem eventKey="circlecut"><Glyphicon glyph="picture"/> サークルカット</NavItem>
            <NavItem eventKey="map"><Glyphicon glyph="map-marker"/> マップ</NavItem>
            <NavItem eventKey="favorite"><Glyphicon glyph="star"/> お気に入り済み <Badge>{Object.keys(favoriteIdx).length}</Badge></NavItem>
          </Nav>
          <br/>
          <Tab.Content>
            <Tab.Pane eventKey="list">
              <CircleListPane
                circles={circleList}
                favorites={favoriteIdx}
                loadings={loading}
                onRowClick={this.openModal}
                onAddFavorite={this.addFavorite}
                onRemoveFavorite={this.removeFavorite}
                showChecklistComponent={!!me}/>
            </Tab.Pane>
            <Tab.Pane eventKey="circlecut">
              <CirclecutPane
                circles={circleList}
                favorites={favoriteIdx}
                loadings={loading}
                onImageClick={this.openModal}
                onAddFavorite={this.addFavorite}
                onRemoveFavorite={this.removeFavorite}
                showChecklistComponent={!!me}/>
            </Tab.Pane>
            <Tab.Pane eventKey="favorite">
              <FavoriteListPane
                circles={circleList}
                favorites={favoriteIdx}
                onRowClick={this.openModal}/>
            </Tab.Pane>
            <Tab.Pane eventKey="map">
              <MapPane
                maps={map}
                circles={circleList}
                favorites={favoriteIdx}
                onCircleClick={this.openModal}/>
            </Tab.Pane>
          </Tab.Content>
        </div>
      </Tab.Container>

      <CircleDescriptionModal
        show={modalShow}
        circle={selectedCircle}
        favorite={selectedCircle ? favoriteIdx[selectedCircle.circle_id] : null}
        loadings={loading}
        onClose={this.closeModal}
        onUpdateComment={this.updateFavoriteComment}
        onAddFavorite={this.addFavorite}
        onRemoveFavorite={this.removeFavorite}
        showChecklistComponent={!!me}/>
    </div>;
  }
}

export default withRouter(AdminRoot);

/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  ActivityIndicator,
  Alert,
  AsyncStorage,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  View,
  ListView,
  Image,
  ImageBackground,
  Picker,
  FlatList,
  RefreshControl,
  ScrollView,
  PermissionsAndroid,
  TouchableHighlight
} from 'react-native';

import {
  createRouter,
  NavigationProvider,
  ExNavigationState,
  StackNavigation,
  TabNavigation,
  TabNavigationItem as TabItem,
} from '@expo/ex-navigation'

import _ from 'lodash'
import * as axios from 'axios';
import * as moment from 'moment';
import ViewShot, { captureRef } from "react-native-view-shot";
import DropdownAlert from 'react-native-dropdownalert';
import RNFetchBlob from 'react-native-fetch-blob';
import Grid from 'react-native-grid-component';
import PTRView from 'react-native-pull-to-refresh';
import * as Progress from './react-native-progress';
import Overlay from 'react-native-modal-overlay';
import { Badge, Button, ButtonGroup, Card, Header, Icon, SearchBar } from 'react-native-elements'

import {
  AdMobBanner,
  AdMobInterstitial,
  PublisherBanner,
  AdMobRewarded
} from 'react-native-admob'

import {
  GoogleAnalyticsTracker,
  GoogleTagManager,
  GoogleAnalyticsSettings
} from "react-native-google-analytics-bridge";

let tracker = new GoogleAnalyticsTracker("UA-53407844-1");
tracker.trackScreenView("Home");

/**
* This is where we map route names to route components. Any React
* component can be a route, it only needs to have a static `route`
* property defined on it, as in HomeScreen below
*/
const Router = createRouter(() => ({
  database: () => DatabaseScreen,
  compare: () => CompareScreen,
  team: () => TeamScreen,
  profile: () => ProfileScreen,
}));

const instructions = Platform.select({
  ios: 'Press Cmd+R to reload,\n' +
    'Cmd+D or shake for dev menu',
  android: 'Double tap R on your keyboard to reload,\n' +
    'Shake or press menu button for dev menu',
});

// type Props = {};
// export default class App extends Component<Props> {
//   render() {
//     return (
//       <View style={styles.container}>
//         <Text style={styles.welcome}>
//           Welcome to React Native!
//         </Text>
//         <Text style={styles.instructions}>
//           To get started, edit App.js
//         </Text>
//         <Text style={styles.instructions}>
//           {instructions}
//         </Text>
//       </View>
//     );
//   }
// }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#393e42',
    alignItems: 'flex-start',
    width: "100%"
  },
  nonSelectedButtonGroup: {
    fontWeight: 'normal',
    fontSize: 14
  },
  selectedTab: {
    backgroundColor: '#e5e5ff'
  },
  selectedButtonGroup: {
    fontWeight: 'bold',
    fontSize: 18
  },
  myteamoverlay: {
    flex: 1,
    top: 0,
    position: 'absolute',
    backgroundColor: 'transparent',
    resizeMode: "cover",
    width: "100%",
    height: "75%",
  }
});

global.compareList = []

export default class App extends React.Component {
  render() {
    /**
      * NavigationProvider is only needed at the top level of the app,
      * similar to react-redux's Provider component. It passes down
      * navigation objects and functions through context to children.
      *
      * StackNavigation represents a single stack of screens, you can
      * think of a stack like a stack of playing cards, and each time
      * you add a screen it slides in on top. Stacks can contain
      * other stacks, for example if you have a tab bar, each of the
      * tabs has its own individual stack. This is where the playing
      * card analogy falls apart, but it's still useful when thinking
      * of individual stacks.
      */
    return (
      <NavigationProvider router={Router}>
        <TabScreen initialRoute={Router.getRoute('database')} />
      </NavigationProvider>
    );
  }
}

// var console = {
//   log: function(msg) { alert(msg); }
// };

class DatabaseScreen extends React.Component {
  /**
    * This is where we can define any route configuration for this
    * screen. For example, in addition to the navigationBar title we
    * could add backgroundColor.
    */
  static route = {
    navigationBar: {
      title: 'Database',
      backgroundColor: '#393e42',
      tintColor: 'white',
    }
  }

  constructor(props){
    super(props);
    this.state = {
      isLoading: true,
      isRefreshing: true,
      bounces: false,
      players: [],
      search: '',
      sortOption: 'custom',
      filterModalVisible: false,
      posSelectedOption: [],
      typeSelectedOption: [],
      failedLoading: null,
      error: null,
    }

    this.statWidth = 50;

    this.getDatabaseData = this.getDatabaseData.bind(this);
    this.convertInchesToHeightString = this.convertInchesToHeightString.bind(this);
    this.renderRow = this.renderRow.bind(this);
    this.renderHeader = this.renderHeader.bind(this);
    this.renderSeparator = this.renderSeparator.bind(this);
    this.toggleFilterModal = this.toggleFilterModal.bind(this);
    this.updatePosIndexes = this.updatePosIndexes.bind(this);
    this.updateTypeIndexes = this.updateTypeIndexes.bind(this);
  }

  async componentDidMount() {
    await this.getDatabaseData();
    global.compareList = JSON.parse(await AsyncStorage.getItem('@NBALMTools:compareList')) || []
  }

  async getDatabaseData() {
    this.setState({ isLoading: true, failedLoading: false, error: null})
    try {
      let response = await axios.get('https://nba-live-mobile-parser-api.herokuapp.com/search/');
      let responseJSON = response.data;
      // Calculate TAS for all cards
      _.forEach(responseJSON, function(player) {
        player['TAS'] = 0
        for (let c = 1; c <= 2; c++) {
          for (let r = 1; r <= 8; r++) {
            let key = `(${c},${r})`
            player['TAS'] += player.stats[key].value;
          }
        }
      })
      /* Default sort is by ovr */
      responseJSON = _.orderBy(responseJSON, ['ovr'], ['desc'])
      this.setState({ isLoading: false, isRefreshing: false, players: responseJSON });
    } catch (error) {
      console.log(error);
      // console.log(JSON.stringify(response.data));
      this.setState({ failedLoading: true, error: error});
    }
  }

  convertInchesToHeightString(inches) {
    const feet = Math.floor(inches/12);
    const inch = inches % 12;
    return `${feet}'${inch}"`;
  }

  renderRow(item) {
    let stats = [];
    for (let c = 1; c <= 2; c++) {
      for (let r = 1; r <= 8; r++) {
        let key = `(${c},${r})`
        let stat = item.stats[key];
        stats.push(<Text key={stat.name} style={{width: this.statWidth, color: 'white', fontSize: 16}}>{stat.value}</Text>);
      }
    }
    const posAbbrToFull = {'PG': 'Point Guard', 'SG': 'Shooting Guard', 'SF': 'Small Foward', 'PF': 'Power Forward', 'C': 'Center'}
    const typeAbbrToFull = {'BAL': 'Balance', 'DEF': 'Defense', 'SHT': 'Shooting', 'POW': 'Power', 'RUN': 'Run & Gun'}
    return <View style={{flex: 1, flexDirection: 'row'}}>
        <TouchableHighlight onPress={() => this._goToProfile(item, this.state.players)}>
          <Image
            style={{width: 70, height: 105}}
            source={{uri: `https://nba-live-mobile-parser-api.herokuapp.com/searchCardImage/?hash=${item.hash}`}}
          />
        </TouchableHighlight>
        <View>
          <Text style={{width: 150, color: 'white', fontWeight: 'bold', fontSize: 16}} >{item.name}</Text>
          {/* <Badge
            value={item.pos}
            textStyle={{ color: 'white' }}
            containerStyle={{width: this.statWidth, color: '#8a7b70', fontSize: 16}}
          />
          <Badge
            value={item.type}
            textStyle={{ color: 'white' }}
            containerStyle={{width: this.statWidth, color: '#8a7b70', fontSize: 16}}
          /> */}
          <Text style={{width: 150, color: 'white', fontSize: 13}} >{posAbbrToFull[item.pos]}</Text>
          <Text style={{width: 150, color: 'white', fontSize: 13}} >{typeAbbrToFull[item.type]}</Text>
        </View>
        <Text style={{width: this.statWidth, color: 'white', fontSize: 16}} >{item.ovr}</Text>
        <Text style={{width: this.statWidth, color: 'white', fontSize: 16}} >{this.convertInchesToHeightString(item.height)}</Text>
        <Text style={{width: this.statWidth*1.5, color: 'white', fontSize: 16}} >{item.TAS}</Text>
        {stats}
      </View>
  }

  renderHeader() {
    let headers = [
      {headerName: "Card", width: 70},
      {headerName: "Details", width: 150},
      {headerName: "OVR", width: this.statWidth, sortProp: "ovr"},
      // {headerName: "Pos", width: this.statWidth},
      // {headerName: "LU", width: this.statWidth},
      {headerName: "HT", width: this.statWidth, sortProp: "height"},
      {headerName: "TAS", width: this.statWidth*1.2, sortProp: "TAS"},
      {headerName: "SPD", width: this.statWidth, sortProp: ["stats", "(1,1)", "value"]},
      {headerName: "AGL", width: this.statWidth, sortProp: ["stats", "(1,2)", "value"]},
      {headerName: "MRS", width: this.statWidth, sortProp: ["stats", "(1,3)", "value"]},
      {headerName: "3PT", width: this.statWidth, sortProp: ["stats", "(1,4)", "value"]},
      {headerName: "IPS", width: this.statWidth, sortProp: ["stats", "(1,5)", "value"]},
      {headerName: "PST", width: this.statWidth, sortProp: ["stats", "(1,6)", "value"]},
      {headerName: "DNK", width: this.statWidth, sortProp: ["stats", "(1,7)", "value"]},
      {headerName: "SWC", width: this.statWidth, sortProp: ["stats", "(1,8)", "value"]},
      {headerName: "OBD", width: this.statWidth, sortProp: ["stats", "(2,1)", "value"]},
      {headerName: "BLK", width: this.statWidth, sortProp: ["stats", "(2,2)", "value"]},
      {headerName: "STL", width: this.statWidth, sortProp: ["stats", "(2,3)", "value"]},
      {headerName: "DRI", width: this.statWidth, sortProp: ["stats", "(2,4)", "value"]},
      {headerName: "PSA", width: this.statWidth, sortProp: ["stats", "(2,5)", "value"]},
      {headerName: "BOX", width: this.statWidth, sortProp: ["stats", "(2,6)", "value"]},
      {headerName: "ORB", width: this.statWidth, sortProp: ["stats", "(2,7)", "value"]},
      {headerName: "DRB", width: this.statWidth, sortProp: ["stats", "(2,8)", "value"]},
    ]
    let headerRow = [];
    for (index in headers) {
      let header = headers[index];
      headerRow.push(
        <TouchableHighlight key={header.headerName}>
          <Text
            activeOpacity={header.hasOwnProperty('sortProp') ? 0.2 : 1.0}
            style={{width: header.width, fontWeight: 'bold', fontSize: 18, color: 'white', backgroundColor:'#393e42'}}
            onPress={() => this.setState(
              {players: _.orderBy(this.state.players,
                function(row) {
                  if (Array.isArray(header.sortProp)) {
                    return row[header.sortProp[0]][header.sortProp[1]][header.sortProp[2]]
                  } else {
                    return row[header.sortProp]
                  }
                },
                ['desc'])}
              )}
          >
          {header.headerName}
          </Text>
        </TouchableHighlight>
      );
    }
    return <View
              style={{height: 25, backgroundColor: '#393e42', flex: 1, flexDirection: 'row'}}
              showsHorizontalScrollIndicator={false}
            >
        {headerRow}
      </View>
  }

  toggleFilterModal(visible) {
    this.setState({filterModalVisible: visible})
  }

  updatePosIndexes (selectedIndex) {
    this.setState({posSelectedOption: selectedIndex})
  }

  updateTypeIndexes (selectedIndex) {
    this.setState({typeSelectedOption: selectedIndex})
  }

  renderSeparator = () => {
    return (
      <View
        style={{
          height: 1,
          backgroundColor: "#494f54",
        }}
      />
    );
  };

  render() {
    if (this.state.failedLoading) {
      return (
        <View style={{alignItems: 'center', justifyContent: 'center', flex: 1, width: "100%"}}>
          <Text>Error loading the database</Text>
          <Button title="Try Again" onPress={() => this.getDatabaseData()}/>
          <Text>{JSON.stringify(this.state.error)}</Text>
        </View>
      )
    } else if(!this.state.isLoading) {
      data = this.state.players
      if (this.state.search.length > 0) {
        data = data.filter(row => {
          return row.name.toLowerCase().includes(this.state.search.toLowerCase())
        })
      }
      const positions = ["PG", "SG", "SF", "PF", "C"]
      if (this.state.posSelectedOption.length > 0) {
        let selectedPos = []
        this.state.posSelectedOption.forEach((pos_index) => {
          selectedPos.push(positions[pos_index])
        })
        data = data.filter(row => {
          return selectedPos.includes(row.pos)
        })
      }
      const types = ["BAL", "DEF", "SHT", "POW", "RUN"]
      if (this.state.typeSelectedOption.length > 0) {
        let selectedType = []
        this.state.typeSelectedOption.forEach((type_index) => {
          selectedType.push(types[type_index])
        })
        data = data.filter(row => {
          return selectedType.includes(row.type)
        })
      }
      if (this.state.sortOption == 'sort_date_added') {
        data = _.orderBy(data, ['add_time'], ['desc'])
      }
      return (
        <View style={styles.container}>
          <Overlay
            visible={this.state.filterModalVisible}
            closeOnTouchOutside animationType="zoomIn"
            onClose={() => {this.toggleFilterModal(false);}}
            containerStyle={{backgroundColor: 'rgba(0, 0, 0, 0.0)'}}
            childrenWrapperStyle={{backgroundColor: '#eee'}}
          >
            <Text style={{fontWeight: "bold", fontSize: 18}} h3>Sort By</Text>
            <Picker
              selectedValue={this.state.sortOption}
              style={{ height: 50, width: "100%" }}
              onValueChange={(itemValue, itemIndex) => {
                this.setState({sortOption: itemValue})
              }}
            >
              <Picker.Item label="Default (Press column headers)" value="custom" />
              <Picker.Item label="Date Added (Newest)" value="sort_date_added" />
            </Picker>
            <Text style={{fontWeight: "bold", fontSize: 18}} h3>Type</Text>
            <ButtonGroup
              onPress={this.updateTypeIndexes}
              selectMultiple
              containerBorderRadius={5}
              selectedIndexes={this.state.typeSelectedOption}
              buttons={types}
            />
            <Text style={{fontWeight: "bold", fontSize: 18}} h3>Position</Text>
            <ButtonGroup
              onPress={this.updatePosIndexes}
              selectMultiple
              containerBorderRadius={5}
              selectedIndexes={this.state.posSelectedOption}
              buttons={positions}
            />
          </Overlay>
          <View style={{flexDirection: "row", justifyContent: 'space-between'}}>
            <SearchBar
              containerStyle={{width: "80%", borderTopColor: '#393e42', borderBottomColor: '#393e42'}}
              onChangeText={(search_term) => this.setState({search: search_term})}
              onClear={() => this.setState({search: ''})}
              placeholder='Search'
              noIcon={true}
            />
            <TouchableHighlight onPress={() => { this.toggleFilterModal(true); }}>
              <Text
                style={{
                  fontSize: 18,
                  padding: 10,
                  fontWeight: "bold",
                  backgroundColor: "transparent",
                  width: "auto",
                  color: "white"
                }}>
                Filter
              </Text>
            </TouchableHighlight>
          </View>
          <ScrollView
            style={{flex: 1}}
            horizontal
          >
            <FlatList
              style={{backgroundColor: 'transparent'}}
              ListHeaderComponent={this.renderHeader}
              data={data}
              renderItem={({item}) =>
                <View>
                  {this.renderRow(item)}
                </View>
              }
              ItemSeparatorComponent={this.renderSeparator}
              keyExtractor={(item, index) => index.toString()}
              stickyHeaderIndices={[0]}
              refreshControl={
                <RefreshControl
                    refreshing={this.state.isRefreshing}
                    onRefresh={() => this.getDatabaseData()}
                />
              }
            />
          </ScrollView>
          <View style={{alignItems: 'center'}}>
            <AdMobBanner
              adSize="banner"
              adUnitID="ca-app-pub-2500318251491684/5719045365"
              testDevices={[AdMobBanner.simulatorId]}
              onAdFailedToLoad={error => console.error(error)}
            />
          </View>
        </View>
      )
    } else {
      return (
        <View style={{alignItems: 'center', justifyContent: 'center', flex: 1}}>
          <ActivityIndicator style={{opacity: 1.0}} size="large" color="#0000ff" animating={true} />
          <Text>Loading..</Text>
        </View>
      )
    }
  }

  _goToProfile = (item, players) => {
    this.props.navigator.push(Router.getRoute('profile', {player: item, player_list: players}));
  }
}

class CompareScreen extends React.Component {
  static route = {
    navigationBar: {
      title: 'Compare',
      backgroundColor: '#393e42',
      tintColor: 'white',
    }
  }

  constructor(props){
    super(props)

    this.state = {
      compareList: [],
      comparePlayerOne: null,
      comparePlayerTwo: null,
    }

    this.addComparePlayer = this.addComparePlayer.bind(this)
    this.clearAll = this.clearAll.bind(this)
    this.removeFromCompareList = this.removeFromCompareList.bind(this)
    this.removeComparePlayer = this.removeComparePlayer.bind(this)
    this.convertInchesToHeightString = this.convertInchesToHeightString.bind(this)
    this.getCompareCardStats = this.getCompareCardStats.bind(this)

    const gridCardRatio = 0.60
    const cardWidth = 118
    const cardHeight = 175
    this.gridCardWidth = cardWidth * gridCardRatio
    this.gridCardHeight = cardHeight * gridCardRatio
  }

  async componentDidMount() {
    global.compareList = JSON.parse(await AsyncStorage.getItem('@NBALMTools:compareList')) || []
    this.setState({compareList: global.compareList})
  }

  async addComparePlayer(player_hash) {
    let response = await axios.get(`https://nba-live-mobile-parser-api.herokuapp.com/searchCardData/?hash=${player_hash}`);
    try {
      let responseJSON = response.data;
      if (this.state.comparePlayerOne == null) {
        this.setState({ comparePlayerOne: responseJSON })
      } else if (this.state.comparePlayerTwo == null) {
        this.setState({ comparePlayerTwo: responseJSON })
        AdMobInterstitial.setAdUnitID('ca-app-pub-2500318251491684/9842709935');
        AdMobInterstitial.setTestDevices([AdMobInterstitial.simulatorId]);
        AdMobInterstitial.requestAd().then(() => AdMobInterstitial.showAd());
      }
    } catch (error) {
      console.log(error);
      console.log(JSON.stringify(response.data));
    }
  }

  async removeComparePlayer(player_one_or_two) {
    if (player_one_or_two == 1) {
      this.setState({ comparePlayerOne: null })
    } else if (player_one_or_two == 2) {
      this.setState({ comparePlayerTwo: null })
    }
  }

  async clearAll() {
    Alert.alert(
      'Clear All',
      'Are you sure you want to clear all?',
      [
        {text: 'No', onPress: () => {}, style: 'cancel'},
        {text: 'Yes', onPress: async () => {
            await AsyncStorage.removeItem('@NBALMTools:compareList');
            global.compareList = []
            this.setState({compareList: []})
          }
        },
      ],
      { cancelable: false }
    )
  }

  async removeFromCompareList(player_hash) {
    const exists = global.compareList.indexOf(player_hash)
    if (exists > -1) {
      global.compareList.splice(exists, 1)
      try {
        await AsyncStorage.setItem('@NBALMTools:compareList', JSON.stringify(global.compareList));
        this.setState({compareList: global.compareList})
      } catch (error) {
        // Error saving data
      }
    } else {
      this.dropdown.alertWithType('error', 'Error Code 2', `${player_data.name} already added to your compare list`);
    }
  }

  _renderItem = (player_hash, i) => (
    // <View key={i} style={{flex: 1, flexDirection: 'row', margin: 0}}>
      <Card key={i} containerStyle={{margin: 1, padding: 3, backgroundColor: 'rgba(52, 52, 52, 0.0)', borderWidth: 0}}>
      {/* <View key={i} style={{flex: 1, margin: 1}}> */}
        <TouchableHighlight style={{width: this.gridCardWidth}} onPress={async () => await this.addComparePlayer(player_hash)}>
          <ImageBackground
            style={{width: this.gridCardWidth, height: this.gridCardHeight, margin: 1}}
            source={{uri: `https://nba-live-mobile-parser-api.herokuapp.com/searchCardImage/?hash=${player_hash}`}}
          >
          </ImageBackground>
        </TouchableHighlight>
        <Button
          icon={<Icon name='close' type='font-awesome' color='#ffffff' />}
          backgroundColor='#e50000'
          fontFamily='Lato'
          buttonStyle={{borderRadius: 0, width: this.gridCardWidth}}
          title=''
          onPress={() => this.removeFromCompareList(player_hash)} />
      </Card>
    // </View>
  );

  _renderPlaceholder = i => <View style={{height: this.gridCardHeight, width: this.gridCardWidth}} key={i} />

  renderCompareRow(rowData) {
    let playerOneColor = 'white'
    let playerTwoColor = 'white'
    if (rowData.playerOne > rowData.playerTwo) {
      playerOneColor = '#59ff59'
      playerTwoColor = 'red'
    } else if (rowData.playerOne < rowData.playerTwo) {
      playerOneColor = 'red'
      playerTwoColor = '#59ff59'
    }
    return <View style={{flex: 1, flexDirection: 'row', alignItems: "center", marginLeft: "5%", marginRight: "5%"}}>
      <Text style={{color: playerOneColor, fontSize: 20, fontWeight: "bold", textAlign: 'left', width: "20%"}} >{rowData.playerOne}</Text>
      <Text style={{color: "#d4d4d4", fontSize: 17, textAlign: 'center', width: "60%"}}>{rowData.name}</Text>
      <Text style={{color: playerTwoColor, fontSize: 20, fontWeight: "bold", textAlign: 'right', width: "20%"}}>{rowData.playerTwo}</Text>
      {/* <Text>{JSON.stringify(this.state.comparePlayerOne)}</Text> */}
    </View>
  }

  convertInchesToHeightString(inches) {
    const feet = Math.floor(inches/12);
    const inch = inches % 12;
    return `${feet}'${inch}"`;
  }

  getCompareCardStats(comparePlayerJSON) {
    let details = [{
      name: "OVR",
      value: comparePlayerJSON.ovr
     }, {
      name: "Height",
      value: this.convertInchesToHeightString(comparePlayerJSON.height)
    }];
    // const statDetails = []
    let totalAdvancedStats = 0
    for (let c = 1; c <= 2; c++) {
      for (let r = 1; r <= 8; r++) {
        let key = `(${c},${r})`
        let stat = comparePlayerJSON['stats'][key]
        const statName = stat["name"];
        const statValue = stat["value"];
        // statDetails.push({
        details.push({
          name: statName,
          value: statValue
        });
        totalAdvancedStats += statValue
      }
    }
    details.push({
      name: "Total Advanced Stats",
      value: totalAdvancedStats
    })
    // details.concat(statDetails)
    return details
  }

  render() {
    const itemsPerRow = Dimensions.get('window').width/(this.gridCardWidth + 3*2 /*card padding is 3*/)

    let cardOneImageSrc = 'https://nba-live-mobile-parser-api.herokuapp.com/searchCardImage/?hash='
    if (this.state.comparePlayerOne) {
      cardOneImageSrc += `${this.state.comparePlayerOne.hash}`
    }
    let cardTwoImageSrc ='https://nba-live-mobile-parser-api.herokuapp.com/searchCardImage/?hash='
    if (this.state.comparePlayerTwo) {
      cardTwoImageSrc += `${this.state.comparePlayerTwo.hash}`
    }

    const cardOneContent = this.state.comparePlayerOne ?
      <View stlye={{flexDirection: 'row', flex: 1, alignItems: "center"}}>
        <View style={{flexDirection:'column'}}>
          <Image
            style={{width: 118, height: 175}}
            source={{uri: cardOneImageSrc}}
          />
          <Button
            icon={<Icon name='close' type='font-awesome' color='#ffffff' />}
            backgroundColor='#03A9F4'
            fontFamily='Lato'
            buttonStyle={{borderRadius: 0, margin: 2}}
            title='Remove'
            onPress={() => this.removeComparePlayer(1)} />
        </View>
      </View> :
      <Text>Select a card below</Text>
    const cardTwoContent = this.state.comparePlayerTwo ?
      <View>
        <Image
          style={{width: 118, height: 175}}
          source={{uri: cardTwoImageSrc}}
        />
        <Button
          icon={<Icon name='close' type='font-awesome' color='#ffffff' />}
          backgroundColor='#03A9F4'
          fontFamily='Lato'
          buttonStyle={{borderRadius: 0, margin: 2}}
          title='Remove'
          onPress={() => this.removeComparePlayer(2)} />
      </View> :
      <Text>Select a card below</Text>

    let displayContent = <View style={{flex: 1}}>
      <Grid
        style={{flex: 1, flexDirection: 'row', alignItems: 'flex-start'}}
        renderItem={this._renderItem}
        renderPlaceholder={this._renderPlaceholder}
        data={this.state.compareList}
        itemsPerRow={itemsPerRow}
      />
      <View style={{flexDirection:"row"}}>
        {/* <Button
          icon={{
            name: 'arrow-right',
            type:'entypo',
            size: 15,
            color: 'white'
          }}
          title='Delete'
          containerStyle={{ width: "45%", margin: "2.5%" }}
        /> */}
        <Button
          icon={{
            name: 'delete',
            type:'material-community',
            size: 15,
            color: 'white'
          }}
          title='Clear All'
          containerStyle={{ width: "95%", margin: "2.5%" }}
          onPress={() => this.clearAll()}
        />
      </View>
    </View>
    if (this.state.comparePlayerOne && this.state.comparePlayerTwo) {
      const comparePlayerOneStats = this.getCompareCardStats(this.state.comparePlayerOne)
      const comparePlayerTwoStats = this.getCompareCardStats(this.state.comparePlayerTwo)
      let compareRows = []
      for (key in comparePlayerOneStats) {
        const statName = comparePlayerOneStats[key].name
        const playerOneStat = comparePlayerOneStats[key].value
        const playerTwoStat = comparePlayerTwoStats[key].value
        compareRows.push({
          name: statName,
          playerOne: playerOneStat,
          playerTwo: playerTwoStat
        })
      }
      displayContent = <ScrollView vertical>
        <FlatList
          renderItem={({item}) =>
          <View>
            {this.renderCompareRow(item)}
          </View>
          }
          data={compareRows}
          keyExtractor={(item, index) => index.toString()}
        />
      </ScrollView>
    }

    return (
      <View style={styles.container}>
        <View style={{flexDirection: "row", justifyContent: 'center', margin: 10}}>
          <Card titleStyle={{fontSize: 14}} containerStyle={{alignItems: 'center', width:"45%", marginTop: 5}}>
            {cardOneContent}
          </Card>
          <Card titleStyle={{fontSize: 14}} containerStyle={{alignItems: 'center', width:"45%", marginTop: 5}}>
            {cardTwoContent}
          </Card>
        </View>
        {displayContent}
      </View>
    )
  }
}

class TeamScreen extends React.Component {
  static route = {
    navigationBar: {
      title: 'My Team',
      backgroundColor: '#393e42',
      tintColor: 'white',
    }
  }

  render() {
    return (
      <View style={{alignItems: 'center', justifyContent: 'center', flex: 1, backgroundColor: '#393e42'}}>
        <Image
          style={styles.myteamoverlay}
          source={require("./assets/images/shotchart_court.png")}
        />
        <Image
          style={styles.myteamoverlay}
          source={require("./assets/images/shotchart_thick_white_court.png")}
        />
      </View>
    )
  }
}

class ProfileScreen extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      progressBarStates: {},
      displayValues: 'stats',
    }
    this.saveCardProfileImage = this.saveCardProfileImage.bind(this);
    this.requestFilePermission = this.requestFilePermission.bind(this);
    this.addToCompareList = this.addToCompareList.bind(this);
    this.reset = this.reset.bind(this);
    this.update = this.update.bind(this);
  }

  static route = {
    navigationBar: {
      title(params) {
        return `${params.player.name}`
      },
      // renderRight: (state) => {
      //   const { config: { eventEmitter }  } = state
      //   return <Icon
      //     name='save'
      //     type='entypo'
      //     size={35}
      //     iconStyle={{margin: 5}}
      //     color='#517fa4'
      //     onPress={() => eventEmitter.emit('save')}
      //   />
      // },
      backgroundColor: '#393e42',
      tintColor: 'white',
    }
  }

  _subscriptionDone = null;

  componentDidMount() {
    //this._subscriptionSave = this.props.route.getEventEmitter().addListener('save', this.saveCardProfileImage);
    //this.reset();
    this.update('stats');
  }

  componentWillUnmount() {
    //this._subscriptionSave.remove();
  }

  async requestFilePermission() {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          'title': 'NBA Live Mobile Tools',
          'message': 'NBA Live Mobile Tools needs access to save file'
        }
      )
    } catch (err) {
      console.warn(err)
    }
  }

  async saveCardProfileImage() {
    await this.requestFilePermission()
    captureRef(this.refs.viewShot, {
      format: "jpg",
      quality: 0.8,
      result: "base64",
    })
    .then(
      async (base64) => {
        const dirExist = await RNFetchBlob.fs.exists(`${RNFetchBlob.fs.dirs.PictureDir}/nbalmtools`)
        if (!dirExist) {
          await RNFetchBlob.fs.mkdir(`${RNFetchBlob.fs.dirs.PictureDir}/nbalmtools`)
        }
        let player_data = this.props.route.params.player
        let file_save_location = `${RNFetchBlob.fs.dirs.PictureDir}/nbalmtools/${player_data.name}_${player_data.ovr}_${player_data.type}_${player_data.hash}_${this.state.displayValues}.jpg`
        await RNFetchBlob.fs.writeFile(
            file_save_location,
            base64,
            'base64'
        )
        RNFetchBlob.fs.scanFile([ { path : file_save_location } ])
        .then(() => {
          this.dropdown.alertWithType('success', 'Saved', `${player_data.name} saved to your Pictures folder`);
        })
        .catch((err) => {
          this.dropdown.alertWithType('error', 'Error Code 1', err)
        })
      },
      error => this.dropdown.alertWithType('error', 'Error Code 1', error)
    );
  }

  async addToCompareList(player_data) {
    const exists = global.compareList.indexOf(player_data.hash) > -1
    if (!exists) {
      global.compareList.push(player_data.hash)
      this.dropdown.alertWithType('success', 'Added', `${player_data.name} added to compare list`);
      try {
        await AsyncStorage.setItem('@NBALMTools:compareList', JSON.stringify(global.compareList));
      } catch (error) {
        // Error saving data
      }
    } else {
      this.dropdown.alertWithType('error', 'Error Code 2', `${player_data.name} already added to your compare list`);
    }
  }

  reset() {
      this.setState(
        {
          progressBarStates: {}
        })
  }

  async update(displayValue) {
    let player_data = this.props.route.params.player;
    let player_list = this.props.route.params.player_list
    // Filter player_list by specific category
    if (displayValue == 'rankings_pos') {
      player_list = _.filter(player_list, {pos: player_data.pos})
    } else if (displayValue == 'rankings_lineup') {
      player_list = _.filter(player_list, {type: player_data.type})
    } else if (displayValue == 'rankings_lineup_group') {
      const player_type_group = player_data.type == 'POW' || player_data.type == 'RUN' ? ['POW', 'RUN'] : ['BAL', 'DEF', 'SHT']
      player_list = _.filter(player_list, (player) => { return player_type_group.indexOf(player.type) > -1 })
    } else if (displayValue == 'rankings_pos_lineup') {
      player_list = _.filter(player_list, {pos: player_data.pos, type: player_data.type})
    } else if (displayValue == 'rankings_pos_lineup_group') {
      const player_type_group = player_data.type == 'POW' || player_data.type == 'RUN' ? ['POW', 'RUN'] : ['BAL', 'DEF', 'SHT']
      player_list = _.filter(player_list, (player) => { return player.pos == player_data.pos && player_type_group.indexOf(player.type) })
    }
    for (key in player_data.stats) {
      let stat = player_data.stats[key];
      let value = stat.value
      let total = 100
      if (displayValue != 'stats') {
        const scoreByCategory = _.orderBy(player_list,
          function(row) {
            return row.stats[key].value
          }, ['desc']).map(function(item) {
            return item.stats[key].value;
          }).indexOf(stat.value)
        value = scoreByCategory + 1
        total = player_list.length
      }
      this.setState((prevState) => {
        let newProgressBarStates = prevState.progressBarStates
        newProgressBarStates[stat.name] = {}
        newProgressBarStates[stat.name].value = value
        newProgressBarStates[stat.name].total = total
        return {
          progressBarStates: newProgressBarStates
        }
      });
    }
  }

  render() {
    let player_data = this.props.route.params.player;
    let progressInsideShootingStatBars = [0, 0, 0];
    let progressInsideShootingStats = ["Inside Paint Shot", "Post Shot", "Scoring With Contact"]
    let progressOutsideShootingStatBars = [0, 0];
    let progressOutsideShootingStats = ["Mid-Range Shot", "3 Point Shot"]
    let progressDefenseStatBars = [0, 0, 0];
    let progressDefenseStats = ["On Ball Defense", "Block", "Steal"];
    let progressReboundingStatBars = [0, 0, 0];
    let progressReboundingStats = ["Box Out", "Offensive Rebounding", "Defensive Rebounding"];
    let progressPlaymakingStatBars = [];
    let progressPlaymakingStats = ["Dribbling", "Passing Accuracy"];
    let progressAthleticismStatBars = [];
    let progressAthleticismStats = ["Speed", "Agility", "Dunking"];
    const window = Dimensions.get('window');
    const CircleSize = (window.width * 0.90 - 3*2 /*margin*/ - 25*2 /* border thickness */)/3
    for (key in player_data.stats) {
      let stat = player_data.stats[key];
      const value = this.state.progressBarStates.hasOwnProperty(stat.name) ? this.state.progressBarStates[stat.name].value : 0
      const total = this.state.progressBarStates.hasOwnProperty(stat.name) ? this.state.progressBarStates[stat.name].total : 0
      let percentage = 0
      if (value == 0 || total == 0) {
        percentage = 0
      } else if (this.state.displayValues != 'stats') {
        percentage = (total - value)/total
      } else {
        percentage = value/total
      }
      const progressCircle = <View key={stat.name} style={{alignItems: 'center'}}>
        <Progress.Circle
          key={stat.name}
          style={{margin: 3}}
          textStyle={{fontSize: 15}}
          progress={percentage}
          formatText={(progress) => this.state.displayValues != 'stats' ? `#${value}` : `${value}`}
          showsText
          size={CircleSize}
          unfilledColor="#e5e5ff"
          thickness={15}
          borderWidth={0}
          borderColor="black"
          borderRadius={0}
          useNativeDriver={true}
          animationConfig={{bounciness: 0 }}
        />
        <Text key={stat.name} style={{textAlign: 'center', width: CircleSize}}>{stat.name}</Text>
      </View>
      if (progressInsideShootingStats.indexOf(stat.name) > -1) {
        progressInsideShootingStatBars[progressInsideShootingStats.indexOf(stat.name)] = progressCircle
      } else if (progressOutsideShootingStats.indexOf(stat.name) > -1) {
        progressOutsideShootingStatBars[progressOutsideShootingStats.indexOf(stat.name)] = progressCircle
      } else if (progressDefenseStats.indexOf(stat.name) > -1) {
        progressDefenseStatBars[progressDefenseStats.indexOf(stat.name)] = progressCircle
      } else if (progressReboundingStats.indexOf(stat.name) > -1) {
        progressReboundingStatBars[progressReboundingStats.indexOf(stat.name)] = progressCircle
      } else if (progressPlaymakingStats.indexOf(stat.name) > -1) {
        progressPlaymakingStatBars[progressPlaymakingStats.indexOf(stat.name)] = progressCircle
      } else if (progressAthleticismStats.indexOf(stat.name) > -1) {
        progressAthleticismStatBars[progressAthleticismStats.indexOf(stat.name)] = progressCircle
      }
    }

    const nba_or_classic = player_data.type == 'POW' || player_data == 'RUN' ? 'POW + RUN' : 'BAL + DEF + SHT'
    return (
      <View>
        <View>
          <DropdownAlert ref={ref => this.dropdown = ref} />
        </View>
        <Picker
          selectedValue={this.state.displayValues}
          style={{ height: 50, width: "100%" }}
          onValueChange={(itemValue, itemIndex) => {
            this.setState({displayValues: itemValue})
            this.update(itemValue)
          }}
        >
          <Picker.Item label="Stats" value="stats" />
          <Picker.Item label="Rankings (Overall)" value="rankings_overall" />
          <Picker.Item label={`Rankings (By ${player_data.pos} Position)`} value="rankings_pos" />
          <Picker.Item label={`Rankings (By ${player_data.type} Lineup)`} value="rankings_lineup" />
          <Picker.Item label={`Rankings (By ${nba_or_classic} Lineups)`} value="rankings_lineup_group" />
          <Picker.Item label={`Rankings (By ${player_data.pos} & ${player_data.type})`} value="rankings_pos_lineup" />
          <Picker.Item label={`Rankings (By ${player_data.pos} & ${nba_or_classic})`} value="rankings_pos_lineup_group" />
        </Picker>
        <AdMobBanner
          adSize="banner"
          adUnitID="ca-app-pub-2500318251491684/5719045365"
          testDevices={[AdMobBanner.simulatorId]}
          onAdFailedToLoad={error => console.error(error)}
        />
        <ScrollView style={{backgroundColor: '#393e42'}} vertical>
          <ViewShot ref="viewShot" options={{ format: "jpg", quality: 0.9 }}>
            <View style={{alignItems: 'center', justifyContent: 'center', flex: 1, backgroundColor: '#393e42'}}>
              <View style={{alignItems: 'center', justifyContent:'center', flex: 1, flexDirection: "row"}}>
                <Image
                  style={{width: 118, height: 175}}
                  source={{uri: `https://nba-live-mobile-parser-api.herokuapp.com/searchCardImage/?hash=${player_data.hash}`}}
                />
                <View style={{marginLeft: 5}}>
                  <Button
                    icon={<Icon name='group-add' color="white" size={30} />}
                    buttonStyle={{
                      backgroundColor: "rgba(92, 99,216, 1)",
                      width: "auto",
                      height: 45,
                      padding: 10,
                      borderColor: "transparent",
                      borderWidth: 0,
                      borderRadius: 5,
                      margin: 5
                    }}
                    title={'Add to Compare List'}
                    onPress={() => this.addToCompareList(player_data)}
                  />
                  <Button
                    icon={<Icon name='save' type="entypo" color="white" size={30} />}
                    buttonStyle={{
                      backgroundColor: "rgba(92, 99,216, 1)",
                      width: "auto",
                      height: 45,
                      padding: 10,
                      borderColor: "transparent",
                      borderWidth: 0,
                      borderRadius: 5,
                      margin: 5
                    }}
                    title={'Save Image'}
                    onPress={this.saveCardProfileImage}
                  />
                </View>
              </View>
              <Card title="Inside Shooting" containerStyle={{width:"90%", marginTop: 5}}>
                <View style={{flexDirection: "row", justifyContent: 'space-between'}}>
                  {progressInsideShootingStatBars}
                </View>
              </Card>
              <Card title="Outside Shooting" containerStyle={{width:"90%"}}>
                <View style={{flexDirection: "row", justifyContent: 'space-between'}}>
                  {progressOutsideShootingStatBars}
                </View>
              </Card>
              <Card title="Defense" containerStyle={{width:"90%"}}>
                <View style={{flexDirection: "row", justifyContent: 'space-between'}}>
                  {progressDefenseStatBars}
                </View>
              </Card>
              <Card title="Rebounding" containerStyle={{width:"90%"}}>
                <View style={{flexDirection: "row", justifyContent: 'space-between'}}>
                  {progressReboundingStatBars}
                </View>
              </Card>
              <Card title="Playmaking" containerStyle={{width:"90%"}}>
                <View style={{flexDirection: "row", justifyContent: 'space-between'}}>
                  {progressPlaymakingStatBars}
                </View>
              </Card>
              <Card title="Athleticism" containerStyle={{width:"90%", marginBottom: 55}}>
                <View style={{flexDirection: "row", justifyContent: 'space-between'}}>
                  {progressAthleticismStatBars}
                </View>
              </Card>
            </View>
          </ViewShot>
        </ScrollView>
      </View>
    )
  }
}

class TabScreen extends React.Component {
  static route = {
    navigationBar: {
      visible: false,
    }
  }

  render() {
    return (
      <TabNavigation
        id="main"
        navigatorUID="main"
        initialTab="database"

        >
        <TabItem
          id="database"
          title="Database"
          selectedStyle={styles.selectedTab}
          renderIcon={(isSelected) => <Icon name='home' type='entypo' size={28} color='#517fa4'/> }>
          <StackNavigation
            id="database"
            navigatorUID="database"
            initialRoute={Router.getRoute('database')}
          />
        </TabItem>

        <TabItem
          id="compare"
          title="Compare"
          selectedStyle={styles.selectedTab}
          renderIcon={(isSelected) => <Icon name='md-people' type='ionicon' size={28} color='#517fa4'/> }>
          <StackNavigation
            id="compare"
            initialRoute={Router.getRoute('compare')}
          />
        </TabItem>

        {/* <TabItem
          id="team"
          title="My Team"
          selectedStyle={styles.selectedTab}
          renderIcon={(isSelected) => <Icon name='pie-chart' type='entypo' size={28} color='#517fa4'/> }>
          <StackNavigation
            id="team"
            initialRoute={Router.getRoute('team')}
          />
        </TabItem> */}
      </TabNavigation>
    );
  }
}
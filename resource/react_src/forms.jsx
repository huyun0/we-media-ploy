import React from 'react'

import { 
  FormGroup,
  Form,
  Col,
  Button,
  Checkbox,
  FormControl,
  ControlLabel
  } from 'react-bootstrap'

function callbackOneByOne(cb,...funcs){

}

//表单验证工厂 返回"success","warning","error"对应验证状态的成功,警告,失败
var ReactValidatorsV={
  success:"success",
  warn:"warning",
  error:"error",
  log:function(reactComponent,fieldName){
    return function(e){
      var patch={}
      patch[fieldName]=e.target.value;
      reactComponent.setState(patch)
      console.log(e.target.value)
    }
  },
  build:function(reactComponent,fieldName,callback,...funcs){
  //工厂方法,构造出对应的eventhandler
  //reactComponent是当前JSX所属对象, fieldName是该对象state中用来存储表单对象值的字段. 此二者用于通过事件监听获取并更新下游component的值
  //funcs是一系列验证函数的组合比如notEmpty("不允许为空"), lenBetween(3,5,"长度在3-5之间")等
  //callback 验证结束后的回调, 一般用于为提示类更新状态/警告文字
    return function(e){
      var patch={}
      patch[fieldName]=e.target.value;
      reactComponent.setState(patch)
      var ret={status:ReactValidatorsV.success}

      
      if (!callback){
        callback=()=>{}
      }
      ReactValidatorsV.callNext(e.target.value,callback,0,...funcs)
      
    }
  },
  notEmpty:function(tip){
    //value是验证对象的当前值, funcs是验证链, cb是funcs验证链结束后调用, idx用来指示...func的当前位置
    return function(value,cb,idx,...funcs){
      if(value!=""){
        ReactValidatorsV.callNext(value,cb,idx+1,...funcs)
      }else{
        cb(ReactValidatorsV.error,tip)
      }
    }
  },
  lenBetween:function(start,end,tip){
    return function(value,cb,idx,...funcs){
      if(value.length>=start && value.length<=end ){
        ReactValidatorsV.callNext(value,cb,idx+1,...funcs)
      }else{
        cb(ReactValidatorsV.error,tip)
      }
    }
  },
  emailReg:/^[a-z_0-9.-]{1,64}@([a-z0-9-]{1,200}.){1,5}[a-z]{1,6}$/,
  isEmail:function(tip){
    return function(value,cb,idx,...funcs){
      if(ReactValidatorsV.emailReg.test(value)){
        ReactValidatorsV.callNext(value,cb,idx+1,...funcs)
      }else{
        cb(ReactValidatorsV.error,tip)
      }
    }
  },
  equal:function(getTarget,tip){
    return function(value,cb,idx,...funcs){
      if(getTarget()==value){
        ReactValidatorsV.callNext(value,cb,idx+1,...funcs)
      }else{
        cb(ReactValidatorsV.error,tip)
      }
    }
  },
  //访问{url}/{value}, 期待返回json对象{status,msg}, 如status=excpect则验证成功,否则验证失败, 调用cb(error,msg)
  //该方法需放在验证链的最后的位置
  ajax:function(url,expect){
    return function(value,cb,idx,...funcs){
      fetch(url+"/"+value)
      .then(function(response) {
        if(response.status>=200&&response.status<300)
          return response.json()
        else{
          var error = new Error(response.statusText)
          error.response = response
          throw error
        }
      }).then(function(json) {
        if(json.status=expect){
          cb(ReactValidatorsV.success)
        }else{
          cb(ReactValidatorsV.success,json.msg)
        }
      }).catch(function(error) {
          console.log('request failed', error)
        })
    }
  },
  password:function(warn,error){//验证密码强弱
    return function(value,cb,idx,...funcs){
      if(value.length<6||value.length>15){
        ReactValidatorsV.callNext(value,cb,idx+1,funcs)
      }else{
        cb(ReactValidatorsV.error,tip)
      }
    }
  },
  callNext(value,cb,idx,...funcs){
    if(idx==funcs.length){
      cb(ReactValidatorsV.success)
    }else{
      //可变参数是一个二维数组, 
      funcs[idx](value,cb,idx,...funcs)
    }
  }
}


//封装最常见的表单单元<FormGroup><label/><input/><FormGroup/>, 传入onChange/onBlur作为回调, 可用于表单验证/获取当前值
class ValidatableInputV extends React.Component{
  constructor(props) {
    super(props);
    this.state={}
    this.onChange=this.onChange.bind(this)
    this.onBlur=this.onBlur.bind(this)
  }
  onChange(e){
    var validateState
    if (this.props.onChange) {
      validateState=this.props.onChange(e)
    }
  }
  onBlur(e){
    var validateState
    if (this.props.onBlur) {
      validateState=this.props.onBlur(e)
    }
  }

  render(){
    return(
      <FormGroup controlId={this.props.controlId} validationState={this.props.validationState}>
        <Col componentClass={ControlLabel} sm={2}>
          {this.props.label}
        </Col>
        <Col sm={10}> 
          <FormControl type={this.props.type} placeholder={this.props.placeholder} onChange={this.onChange} onBlur={this.onBlur}/>
        </Col>
      </FormGroup>
    )
  }
}

class TextareaV extends React.Component{
  constructor(props) {
    super(props);
    this.state = {
        value: '',
        tags: ["go","babel"]
    };
  }
  render(){
    return
    <textarea class="form-control" rows="3" placeholder="props.placeholder" > 
    </textarea>
  }
}

//接受onSuccess作为登录成功后的回调(onSuccess接受服务器返回的json对象作为参数), 用于关闭modal/显示用户菜单等
export class LogInFormV extends React.Component{
  constructor(props) {
    super(props);
    this.state = {
    };
    this.sub=this.sub.bind(this);
  }  
  componentDidMount(){//渲染时即判断是否有未过期的session, 有则直接登录
    LogInFormV.AskForLogin(null,null,this.props.onSuccess)
  }
  sub(){
    if(this.state.account_validate==ReactValidatorsV.error){
      return
    }
    LogInFormV.AskForLogin(this.state.account_value,this.state.passwd_value,this.props.onSuccess,function(resp,ex){
      console.log("login failed, response:")
      console.log(resp)
      console.log("exception:")
      console.log(ex)
    })
  } 

  render(){
    return(
        <Form horizontal>
          <ValidatableInputV label="帐号" controlId="loginAccount" type="email" placeholder="Email" validationState={this.state.account_validate} onBlur={
            ReactValidatorsV.build(this,"account_value",(status,msg)=>{this.setState({account_validate:status})},ReactValidatorsV.lenBetween(4,60,"len error"),ReactValidatorsV.isEmail("not email"))} /> 

          <ValidatableInputV label="密码" controlId="loginPassword" type="password" placeholder="password" validationState={this.state.passwd_validate} onChange={
            ReactValidatorsV.build(this,"passwd_value")} /> 

          <FormGroup>
            <Col smOffset={2} sm={10}>
              <Checkbox>Remember me</Checkbox>
            </Col>
          </FormGroup>

          <FormGroup>
            <Col smOffset={2} sm={10}>
              <Button type="button" onClick={this.sub}>
                Sign in
              </Button>
            </Col>
          </FormGroup>
        </Form>
    )
  }
}
LogInFormV.AskForLogin=function(account,passwd,onJson,onError){
    fetch('/u/login',{
      credentials: 'same-origin',//根据fetch文档, 需要设置此项才能发送/接受cookie
      method: 'POST',
      headers: {
        'Content-Type': 'application/json' 
      },
      body:JSON.stringify({
        email:account,
        passwd:passwd,
      })
    },onJson,onError);  }

//新用户注册
export class RegistFormV extends React.Component{
  constructor(props) {
    super(props);
    this.state = {
    };
    this.sub=this.sub.bind(this);
  }
  sub(){
    if(!(this.state.account_validate&&this.state.passwd_validate&&this.state.confirm_passwd_validate)){
      return
    }
    fetch('/u/regist',{
      method: 'POST',
      headers: {
        'Content-Type': 'application/json' 
      },
      body:JSON.stringify({
        email:this.state.account_value,
        passwd:this.state.passwd_value
      })
    }).then(function(response) {
      return response.json()
    }).then((json) =>{
      console.log('parsed json', json)
      if (this.props.callback){
        this.props.callback()
      }
    }).catch(function(ex) {
      console.log('parsing failed', ex)
    })
  }

  render(){
    return(
        <Form horizontal>
          <ValidatableInputV label="帐号" controlId="loginAccount" type="email" placeholder="Email" validationState={this.state.account_validate} onBlur={
            ReactValidatorsV.build(this,"account_value",(status,msg)=>{console.log(msg);this.setState({account_validate:status})},
              ReactValidatorsV.lenBetween(4,60,"长度在4-60之间"),
              ReactValidatorsV.isEmail("not email"),
              ReactValidatorsV.ajax("/uexist","success"))} /> 

          <hr className="transparent"/>

          <ValidatableInputV label="密码" controlId="registerPassword" type="password" placeholder="password" validationState={this.state.passwd_validate} onChange={
            ReactValidatorsV.build(this,"passwd_value",(status,msg)=>{this.setState({passwd_validate:status})},ReactValidatorsV.password("","长度在6-15之间"))} /> 
          <ValidatableInputV label="重新输入" controlId="confirmPassword" type="password" placeholder="confirm your password" validationState={this.state.confirm_passwd_validate} onBlur={
            ReactValidatorsV.build(this,"confirm_value",(status,msg)=>{this.setState({confirm_passwd_validate:status})},ReactValidatorsV.equal(()=> this.state.passwd_value,"两次输入密码不一致"))} /> 

          <FormGroup>
            <Col smOffset={2} sm={10}>
              <Button className="pull-right" type="button" onClick={this.sub}>
                提交
              </Button>
            </Col>
          </FormGroup>
        </Form>
    )
  }
}

export class AddArticleFormV extends React.Component{
  constructor(props) {
    super(props);
    this.state = {
    };
    this.sub=this.sub.bind(this);
    this.update=this.update.bind(this);
  }
  sub(){
    fetch('/a/new',{
      method: 'POST',
      headers: {
        'Content-Type': 'application/json' 
      },
      body:JSON.stringify({
        title:this.state.title.value,
        tags:this.state.tags.value,
        body:ReactDOM.findDOMNode(this.refs.articleBody).value, 
      })
    }).then(function(response) {
      return response.json()
    }).then(function(json) {
      console.log('parsed json', json)
    }).catch(function(ex) {
      console.log('parsing failed', ex)
    })
  }
  update(key){
    return ref=>{this.state[key]=ref}    
  }

  render(){
    return(
        <form>
          

          <FormGroup controlId="formControlsTextarea">
            <ControlLabel>正文</ControlLabel>
            <FormControl rows="4" componentClass="textarea" placeholder="仅支持md" ref="articleBody" />
          </FormGroup>

          <Button  onClick={this.sub}>Submit</Button>
        </form>
    )
  }
};



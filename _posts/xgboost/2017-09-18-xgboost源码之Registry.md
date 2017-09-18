---
layout: post
title:  "xgboost源码之Registry"
keywords: "xgboost,Registry"
description: "xgboost源码之Registry"
category: xgboost
tags: [xgboost Registry]
---

## 1. 注册相关的类

在xgboost代码中，有一组类和宏来实现**注册**操作，保证全局的唯一性和安全性。

### 1.1 FunctionRegEntryBase

```FunctionRegEntryBase``` 是注册函数的公共子类，简单说，一个```FunctionRegEntryBase```的对象，一般代表某个类的构造函数，且对象中包含参数和返回类型的详细信息。

```FunctionRegEntryBase<EntryType, FunctionType>```是模板类，第一个模板参数类型是```FunctionRegEntryBase```的子类，例如：

```
struct TreeFactory : public FunctionRegEntryBase<TreeFactory, std::function<Tree*()> > {};
```

这是C++中模板的一种特殊使用方式，称为：[奇特的递归模板模式](https://www.suninf.net/2011/06/curiously-recurring-template-pattern.html)

**FunctionRegEntryBase**的所有公共方法都返回子类的应用，便于链式代码的编写，后文包含对应的使用方式。完整代码为：

```c
/*!
 * 注册函数的公共基类
 *
 *  // 下面的代码展示了如何使用Registry类创建“用于获取tree的工厂”
 *  struct TreeFactory : public FunctionRegEntryBase<TreeFactory, std::function<Tree*()> > {};
 *
 *  // 在一个独立的源文件中使用如下宏使TreeFactory类可用
 *  namespace dmlc {
 *  DMLC_REGISTRY_ENABLE(TreeFactory);
 *  }
 *
 *  // 使用宏DMLC_REGISTRY_REGISTER注册二叉树构造函数 ，
 *  DMLC_REGISTRY_REGISTER(TreeFactory, TreeFactory, BinaryTree)
 *      .describe("Constructor of BinaryTree")
 *      .set_body([]() { return new BinaryTree(); });
 *
 * EntryType：FunctionRegEntryBase的子类型
 * FunctionType：函数的类型
 */
template<typename EntryType, typename FunctionType>
class FunctionRegEntryBase {
 public:
  // 注册条目的名字
  std::string name;
  // 注册条目的描述
  std::string description;
  // 工厂函数额外的参数
  std::vector<ParamFieldInfo> arguments;
  // 函数体，其类型为第二个模板参数
  FunctionType body;
  // 返回类型
  std::string return_type;

  /*!
   * 设置函数体
   */
  inline EntryType &set_body(FunctionType body) {
    this->body = body;
    return this->self();
  }
  
  // 设置函数的描述
  inline EntryType &describe(const std::string &description) {
    this->description = description;
    return this->self();
  }
  
  /*!
   * 增加参数
   * name: 参数的名字
   * type: 参数的类型
   * description: 参数的描述
   */ 
  inline EntryType &add_argument(const std::string &name,
                                 const std::string &type,
                                 const std::string &description) {
    ParamFieldInfo info;
    info.name = name;
    info.type = type;
    info.type_info_str = info.type;
    info.description = description;
    arguments.push_back(info);
    return this->self();
  }
  
  // 增加参数
  inline EntryType &add_arguments(const std::vector<ParamFieldInfo> &args) {
    arguments.insert(arguments.end(), args.begin(), args.end());
    return this->self();
  }
  
  // 设置函数的返回类型，可以是Symbol 或者Symbol[]
  inline EntryType &set_return_type(const std::string &type) {
    return_type = type;
    return this->self();
  }

 protected:
  // 返回第一个模板参数的应用，注意：第一个模板参数EntryType是该类的子类
  inline EntryType &self() {
    return *(static_cast<EntryType*>(this));
  }
};
```

### 1.2 Registry

```Registry<typename EntryType>```是xgboost中注册模板类，用于注册全局单例对象，一般用于工厂函数。可以把```Registry<typename EntryType>```看成是一个容器类，里面包含"name->constructor"
的映射。

其源码为：

```c
template<typename EntryType>
class Registry {
 public:
  /*
   * 静态方法，返回注册的条目列表
   **/
  inline static const std::vector<const EntryType*>& List() {
    return Get()->const_list_;
  }
  
  /*
   * 静态方法，返回注册列表中所有的名字，包含别名
   **/
  inline static std::vector<std::string> ListAllNames() {
    const std::map<std::string, EntryType*> &fmap = Get()->fmap_;
    typename std::map<std::string, EntryType*>::const_iterator p;
    std::vector<std::string> names;
    for (p = fmap.begin(); p !=fmap.end(); ++p) {
      names.push_back(p->first);
    }
    return names;
  }
  
  /*
   * 静态方法，获取name对应的条目；
   * 使用Get()方法获取单例对象
   */
  inline static const EntryType *Find(const std::string &name) {
    const std::map<std::string, EntryType*> &fmap = Get()->fmap_;
    typename std::map<std::string, EntryType*>::const_iterator p = fmap.find(name);
    if (p != fmap.end()) {
      return p->second;
    } else {
      return NULL;
    }
  }
  
  /*
   * 对key_name，增加一个别名
   */
  inline void AddAlias(const std::string& key_name,
                       const std::string& alias) {
    EntryType* e = fmap_.at(key_name);
    if (fmap_.count(alias)) {
      CHECK_EQ(e, fmap_.at(alias))
          << "Entry " << e->name << " already registered under different entry";
    } else {
      fmap_[alias] = e;
    }
  }
  
  /*
   * 内部函数，注册一个函数，与name相关联，并将其压入famp_、const_list_和entry_list_，此时所注册的函数只有名字
   */
  inline EntryType &__REGISTER__(const std::string& name) {
    CHECK_EQ(fmap_.count(name), 0U)
        << name << " already registered";
    EntryType *e = new EntryType();
    e->name = name;
    fmap_[name] = e;
    const_list_.push_back(e);
    entry_list_.push_back(e);
    return *e;
  }
  
  /*
   * 内部函数，注册或者获取已经注册条目
   */
  inline EntryType &__REGISTER_OR_GET__(const std::string& name) {
    if (fmap_.count(name) == 0) {
      return __REGISTER__(name);
    } else {
      return *fmap_.at(name);
    }
  }
  
  /* 返回Registry<EntryType>的单例对象；
   * 静态方法
   * 其函数体通过宏DMLC_ENABLE_REGISTRY，即通过DMLC_ENABLE_REGISTRY达到Registry<EntryType>可用的目的
   */
  static Registry *Get();

 private:
  // 类型列表
  std::vector<EntryType*> entry_list_;
  // 类型列表
  std::vector<const EntryType*> const_list_;
  // name->function的映射，通过名字获取函数
  std::map<std::string, EntryType*> fmap_;
  // 私有默认构造函数
  Registry() {}
  // 私有析构函数，释放所有的entry_list_中的指针
  ~Registry() {
    for (size_t i = 0; i < entry_list_.size(); ++i) {
      delete entry_list_[i];
    }
  }
};
```

需要注意的是，```Registry```中的```Get```方法并没有给出具体定义，其定义需要通过下文中的宏给出。

## 2. 注册宏

### 2.1 DMLC_REGISTRY_ENABLE

宏```DMLC_REGISTRY_ENABLE```用于完善Registry<EntryType>的定义：即给出```Registry<EntryType>::Get()```函数的定义，具体的：

```
#define DMLC_REGISTRY_ENABLE(EntryType)                                 \
  template<>                                                            \
  Registry<EntryType > *Registry<EntryType >::Get() {                   \
    static Registry<EntryType > inst;                                   \
    return &inst;                                                       \
  }   
```
  
### 2.2 注册宏

```
#define DMLC_REGISTRY_REGISTER(EntryType, EntryTypeName, Name)          \
  static EntryType & __make_ ## EntryTypeName ## _ ## Name ## __ = \
      ::dmlc::Registry<EntryType>::Get()->__REGISTER__(#Name)  
```

在xgboost中，并没有使用```DMLC_REGISTRY_REGISTER```宏进行注册，而是对于每组相关的类，定义了特定的注册宏，例如下文的```XGBOOST_REGISTER_METRIC```。

## 3. 使用举例

在模型训练过程中，xgboost通过计算一系列的指标来展示模型性能的变化，例如：AUC、MAP等等。在xgboost中，这些指标通过```Metric```及其子类实现。

### 3.1 Metric和MetricReg

**Metric**是xgboost中**指标**的父类，其代码较为简单，如下所示：

```c
/*!
 * 评价指标接口，用于衡量模型的性能
 */
class Metric {
 public:
  /*
   * 计算metric
   **/
  virtual bst_float Eval(const std::vector<bst_float>& preds,
                         const MetaInfo& info,
                         bool distributed) const = 0;
  // 虚函数，返回metric的名称
  virtual const char* Name() const = 0;
  virtual ~Metric() {}
  
  /*!
   * 静态函数，根据名字返回对应的metric
   * name: metric名字，可以为：metric[@]param
   */ 
  static Metric* Create(const std::string& name);
};
```

要使用上面的类实现**注册**，需要为```metric```编写**注册条目**类，例如下面的```MetricReg```。```MetricReg```继承自```FunctionRegEntryBase```，每个```MetricReg```的对象包含一个```Metric```子类的构造函数，并将```MetricReg```对象压入```Registry<MetricReg>```单例中

```c
struct MetricReg
    : public dmlc::FunctionRegEntryBase<MetricReg,
                                        std::function<Metric* (const char*)> > {
};
```

```c
DMLC_REGISTRY_ENABLE(::xgboost::MetricReg);
```

使用宏```DMLC_REGISTRY_ENABLE```实现```Registry<MetricReg>```的Get()方法，完善```Registry<MetricReg>```的定义，上述代码展开后为：

```c
template<> Registry<MetricReg> *Registry<MetricReg>::Get(){
    static Registry<EntryType > inst;  
    return &inst;
}
```

至此，定义了Metric接口，以及注册Metric信息的 ```Registry<MetricReg>```

### 3.2 子类EvalAUC和EvalMAP

```c
// 分类和排序模型中AUC指标
struct EvalAuc : public Metric {
  bst_float Eval(const std::vector<bst_float> &preds,
                 const MetaInfo &info,
                 bool distributed) const override {
  // .....
  }
  const char* Name() const override {
    return "auc";
  }
};

/*! \brief Evaluate rank list */ 排序指标
struct EvalRankList : public Metric {
 public:
  bst_float Eval(const std::vector<bst_float> &preds,
                 const MetaInfo &info,
                 bool distributed) const override {
  // .....
  }
  const char* Name() const override {
    return name_.c_str();
  }
 // ...
};

// MAP
struct EvalMAP : public EvalRankList {
 public:
  explicit EvalMAP(const char *name) : EvalRankList("map", name) {}

 protected:
  // ...
};
```

子类的注册：

```c
XGBOOST_REGISTER_METRIC(Auc, "auc")
.describe("Area under curve for both classification and rank.")
.set_body([](const char* param) { return new EvalAuc(); });


XGBOOST_REGISTER_METRIC(MAP, "map")
.describe("map@k for rank.")
.set_body([](const char* param) { return new EvalMAP(param); });
```

在xgboost中，```metric``` 的注册使用宏：```XGBOOST_REGISTER_METRIC```来实现，具体的：

```c
#define XGBOOST_REGISTER_METRIC(UniqueId, Name)                         \
  ::xgboost::MetricReg&  __make_ ## MetricReg ## _ ## UniqueId ## __ =  \
      ::dmlc::Registry< ::xgboost::MetricReg>::Get()->__REGISTER__(Name)
```

以```auc```为例，上述宏展开后的代码为：

```c
::xgboost::MetricReg&  __make_MetricReg_Auc__ = \
::dmlc::Registry< ::xgboost::MetricReg>::Get()->__REGISTER__("auc")
```

由于```FunctionRegEntryBase```的成员函数大多返回子类自身引用，所以支持“链式”代码的编写。进一步，上面的注册代码为(去掉命名空间以便简化代码)：

```c
MetricReg&  __make_MetricReg_Auc__ = Registry< MetricReg>::Get()->__REGISTER__("auc")
.describe("Area under curve for both classification and rank.")
.set_body([](const char* param) { return new EvalAuc(); });
```

### 3.4 工厂方法的实现

```Metric```类定义了静态函数```Create(const string& name)```，该方法的实现原理为：从```Registry<MetricReg>```单例对象中获取参数```name```对应的```MetricReg```对象（该对象包含对应```Metric```子类的构造函数），通过该对象构建相应的```metric```子类对象。具体的源码如下：

```c
Metric* Metric::Create(const std::string& name) {
  std::string buf = name;
  std::string prefix = name;
  auto pos = buf.find('@');
  if (pos == std::string::npos) {
    auto *e = ::dmlc::Registry< ::xgboost::MetricReg>::Get()->Find(name);
    if (e == nullptr) {
      LOG(FATAL) << "Unknown metric function " << name;
    }
    return (e->body)(nullptr);
  } else {
    std::string prefix = buf.substr(0, pos);
    auto *e = ::dmlc::Registry< ::xgboost::MetricReg>::Get()->Find(prefix.c_str());
    if (e == nullptr) {
      LOG(FATAL) << "Unknown metric function " << name;
    }
    return (e->body)(buf.substr(pos + 1, buf.length()).c_str());
  }
}
```

--- 

总结：

xgboost中，**注册**的实现组件为：

1. ```Registry<EntryType>```类，该类为单例类，每个特化只有一个对象。可以把该类看为一个容器，一般容器内存放"name->构造函数"的影视
2. ```FunctionRegEntryBase<typename EntryType, typename FunctionType>```类，该类的实现利用了C++中的“奇特的递归模板模式（CRTP）”，每个```FunctionRegEntryBase```对象对应一个构造函数

**注册**对应的步骤为：

1. 用户定义基类以及对应的子类，例如： ```Base, Derived1, Derived2, ...```
2. 为这组继承类编写**注册条目**类，例如```BaseReg```，且该类继承自```FunctionRegEntryBase```
3. 使用宏```DMLC_REGISTRY_ENABLE```完善```Registry<BaseReg>```的定义，使其可用
4. 为这组类定义注册宏，例如上面的```XGBOOST_REGISTER_METRIC```，并依次利用该宏完成子类的注册，同时设置子类构造函数的函数体以及其他参数等